import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { RewardCategory, TransactionStatus } from '@prisma/client';
import { prisma } from '../../../lib/prisma.js';
import { logError, logWarn } from '../../../lib/logger.js';
import { SimulateRequestSchema } from '../../../lib/schemas/simulate.js';
import { validateEngineDecision } from '../../../lib/engine-invariants.js';
import {
  resolveUserContext,
  assertUserId,
  logInvariant,
  isPrismaP2003,
} from '../../../lib/user-context.js';
import { asAppError, isUnauthorized, asLogMeta } from '../../../lib/errors.js';
import {
  buildEngineContext,
  mapSolverDecisionToLegacyDecision,
  type LegacyEngineDecision,
} from '../../../lib/engine.js';
import { safeSolveDecisionForWorld } from '../../../lib/engine/run.js';
import { fromPrismaUserToEngineState } from '../../../lib/engine-state.js';
import { runEngine as runLegacyEngine } from '../../../lib/legacy-engine.js';
import { ensureBucketFresh } from '../../../lib/buckets/ensure-fresh.js';
import { hasText } from '../../../lib/text.js';
import { isPositiveNumber } from '../../../lib/numbers.js';
import { logGuardrailEvent, logInvariantViolation } from '../../../lib/log.js';
import { buildSwipeIdempotencyKey } from '../../../lib/ids.js';
import { parseJsonBody } from '../../../lib/validation.js';
import { recordDecisionEvent, simulateSpendAuthority } from '../../../lib/adapters/runtime/authority.prisma.js';
import { buildPrismaWorld } from '../../../lib/adapters/runtime/world.prisma.js';
import type {
  SimulatedAuthorityDecision,
  SimulateSpendParams,
} from '../../../lib/authority/simulateSpendAuthority.js';
import { auth } from '../../../lib/auth.js';

const validCategories = Object.values(RewardCategory) as string[];

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestNow = new Date();
  const requestNowMs = requestNow.getTime();
  const requestTimestamp = requestNow.toISOString();
  let authorityDecision: SimulatedAuthorityDecision | null = null;
  try {
    const { userId, mode } = await resolveUserContext({
      getSession: auth,
      requireAuth: false,
      allowLabDemo: true,
    });
    assertUserId(userId, 'api/simulate POST');

    const parsedBody = await parseJsonBody(request, SimulateRequestSchema);
    if (parsedBody.ok !== true) {
      logGuardrailEvent({
        userId,
        surface: 'simulate',
        outcome: 'STOP',
        reason: 'INVALID_PAYLOAD',
        timestamp: requestTimestamp,
        timestampSource: 'boundary',
      });
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: parsedBody.response.status }
      );
    }
    const body = parsedBody.data;

    const normalizedCategory = body.category.toUpperCase();
    const merchantName = hasText(body.merchantName) ? body.merchantName.trim() : '';
    const validationErrors: string[] = [];

    if (!isPositiveNumber(body.amountCents)) {
      validationErrors.push('amountCents');
    }

    if (!hasText(normalizedCategory) || !validCategories.includes(normalizedCategory)) {
      validationErrors.push('category');
    }

    if (!hasText(merchantName)) {
      validationErrors.push('merchantName');
    }

    let mccCode: number | null = null;
    if (body.mccCode !== null && body.mccCode !== undefined) {
      const asInt = Number.parseInt(String(body.mccCode), 10);
      const hasValidMcc = Number.isInteger(asInt) && String(asInt).length === 4;
      if (!hasValidMcc) {
        validationErrors.push('mccCode');
      } else {
        mccCode = asInt;
      }
    }

    if (validationErrors.length > 0) {
      logGuardrailEvent({
        userId,
        surface: 'simulate',
        outcome: 'STOP',
        reason: 'INVALID_FIELDS',
        detail: { fields: validationErrors },
        timestamp: requestTimestamp,
        timestampSource: 'boundary',
      });
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    let simulationId: string;
    if (hasText(body.simulationId)) {
      simulationId = body.simulationId;
    } else {
      simulationId = (
        await prisma.simulation.create({
          data: { userId },
          select: { id: true },
        })
      ).id;
    }

    const world = buildPrismaWorld();
    const authorityParams: SimulateSpendParams = {
      userId,
      amountCents: body.amountCents,
      category: normalizedCategory as RewardCategory,
      surface: 'simulate',
      counterfactuals: [],
    };
    const authorityResult = await simulateSpendAuthority(authorityParams, { nowMs: requestNowMs });
    authorityDecision = authorityResult.decision;
    if (authorityResult.ok !== true) {
      logGuardrailEvent({
        userId,
        surface: 'simulate',
        outcome: authorityResult.status === 'blocked' ? 'STOP' : 'FALLBACK',
        reason: `AUTHORITY_${authorityResult.reason}`,
        detail: { status: authorityResult.status },
        timestamp: requestTimestamp,
        timestampSource: 'boundary',
      });
    } else {
      await recordDecisionEvent({
        userId,
        surface: 'simulate',
        params: authorityParams,
        decision: authorityDecision,
      });
    }
    const ctx = buildEngineContext({
      surface: 'web',
      nowMs: requestNowMs,
      merchantName,
      merchantCategoryKey: normalizedCategory,
      mcc: mccCode != null ? String(mccCode) : null,
      amountCents: body.amountCents,
    });

    const state = await fromPrismaUserToEngineState(userId, requestNowMs);
    const engineResult = await safeSolveDecisionForWorld(world, userId, ctx, {
      maxCandidates: 64,
      stateOverride: state,
      legacyDecisionProvider: runLegacyEngine,
    });
    if (engineResult.ok !== true) {
      logWarn('Engine failed in /api/simulate', { userId, mode, reason: engineResult.reason });
      logGuardrailEvent({
        userId,
        surface: 'simulate',
        outcome: 'FALLBACK',
        reason: `ENGINE_${engineResult.reason}`,
        timestamp: requestTimestamp,
        timestampSource: 'boundary',
      });
      return NextResponse.json(
        {
          simulationId,
          transaction: null,
          decision: null,
          authority: authorityDecision,
          error: {
            code: engineResult.reason,
            message: engineResult.message,
          },
        },
        { status: 200 }
      );
    }

    const topDecision =
      engineResult.decisions.find(
        (decision) =>
          decision.action.type === 'USE_CARD' || decision.action.type === 'USE_CARD_WITH_PAYDOWN'
      ) ?? engineResult.decisions.at(0);
    const mappedDecision = mapSolverDecisionToLegacyDecision({
      ...(topDecision ? { solverDecision: topDecision } : {}),
      state: engineResult.state,
      ctx,
      category: normalizedCategory as RewardCategory,
      ...(engineResult.legacyDecision ? { fallback: engineResult.legacyDecision } : {}),
    });

    if (mappedDecision === null) {
      logWarn('Engine mapping failed in /api/simulate', { userId, mode });
      logGuardrailEvent({
        userId,
        surface: 'simulate',
        outcome: 'FALLBACK',
        reason: 'ENGINE_MAPPING_FAILED',
        timestamp: requestTimestamp,
        timestampSource: 'boundary',
      });
      return NextResponse.json(
        {
          simulationId,
          transaction: null,
          decision: null,
          authority: authorityDecision,
          error: { code: 'ENGINE_MAPPING', message: 'Unable to build decision' },
        },
        { status: 200 }
      );
    }

    const decision: LegacyEngineDecision = mappedDecision;
    validateEngineDecision(decision);

    if (!isPositiveNumber(decision.amountCents)) {
      logInvariantViolation({
        surface: 'simulate',
        detail: 'Decision amount missing',
        data: { decision },
        timestamp: requestTimestamp,
      });
      return NextResponse.json(
        { error: 'Unable to process decision' },
        {
          status: 500,
        }
      );
    }

    const hasCardId = hasText(decision.card.cardId);
    if (!hasCardId) {
      logGuardrailEvent({
        userId,
        surface: 'simulate',
        outcome: 'STOP',
        reason: 'MISSING_CARD',
        timestamp: requestTimestamp,
        timestampSource: 'boundary',
      });
      return NextResponse.json(
        {
          simulationId,
          transaction: null,
          decision: null,
          authority: authorityDecision,
          error: { code: 'INCOMPLETE_DECISION', message: 'No card available for simulation' },
        },
        { status: 200 }
      );
    }

    if (!hasText(decision.budget.bucketId)) {
      logGuardrailEvent({
        userId,
        surface: 'simulate',
        outcome: 'WARN',
        reason: 'MISSING_BUCKET',
        timestamp: requestTimestamp,
        timestampSource: 'boundary',
      });
    }

    const strictDecline =
      (decision.budget.wouldExceed ?? false) && (decision.budget.strictMode ?? false);
    const bucketBeforeCents =
      decision.budget.limitCents != null && decision.budget.spentBeforeCents != null
        ? decision.budget.limitCents - decision.budget.spentBeforeCents
        : null;
    const bucketAfterCents = strictDecline
      ? bucketBeforeCents
      : decision.budget.remainingAfterCents ?? null;
    const bucketLimitCents = decision.budget.limitCents ?? null;
    const rewardMultiplier =
      decision.card.rewardUnit === 'issuer_points' ? (decision.card.rewardRate ?? null) : null;
    const rewardsEarnedPoints = decision.card.rewardPoints ?? null;
    const rewardsEarnedCents = decision.card.rewardValueCents ?? null;
    const cashbackPercent =
      decision.card.rewardUnit === 'cashback_cents' && decision.card.rewardRate != null
        ? decision.card.rewardRate * 100
        : null;
    const shouldCommit = body.commit === true;
    const canCommit =
      shouldCommit &&
      !strictDecline &&
      process.env.NODE_ENV !== 'production' &&
      hasText(decision.budget.bucketId) &&
      hasCardId &&
      isPositiveNumber(body.amountCents) &&
      hasText(merchantName);
    let swipeIdempotencyKey: string | null = null;
    if (canCommit) {
      swipeIdempotencyKey = buildSwipeIdempotencyKey({
        userId,
        merchant: merchantName,
        amountCents: body.amountCents,
        occurredAt: requestNow,
      });
      logGuardrailEvent({
        userId,
        surface: 'simulate',
        outcome: 'OK',
        reason: 'COMMIT_READY',
        detail: { swipeIdempotencyKey },
        timestamp: requestTimestamp,
        timestampSource: 'boundary',
      });
    } else if (shouldCommit) {
      logGuardrailEvent({
        userId,
        surface: 'simulate',
        outcome: 'STOP',
        reason: 'COMMIT_PRECONDITION_FAILED',
        detail: {
          strictDecline,
          bucketId: decision.budget.bucketId ?? null,
          cardId: decision.card.cardId ?? null,
        },
        timestamp: requestTimestamp,
        timestampSource: 'boundary',
      });
    }

    const tx = await prisma.$transaction(async (db) => {
      const simTx = await db.simulatedTransaction.create({
        data: {
          simulationId,
          userId,
          amount: body.amountCents,
          merchantName,
          resolvedCategory: decision.category,
          mccCode,

          bucketId: decision.budget.bucketId ?? null,
          bucketName: decision.budget.name ?? null,
          bucketPeriod: null,
          bucketBeforeCents,
          bucketAfterCents,
          bucketLimitCents,

          chosenCardId: decision.card.cardId ?? null,
          chosenCardName: decision.card.cardNickname ?? null,

          rewardMultiplier,
          rewardsEarned: rewardsEarnedPoints,
          multiplier: rewardMultiplier,
          cashbackPercent,
          rewardsEarnedPoints: rewardsEarnedPoints,
          rewardsEarnedCents,

          strictDecline,
          status: strictDecline ? TransactionStatus.DECLINED : TransactionStatus.APPROVED,
          reason: strictDecline ? 'STRICT_DECLINE' : 'APPROVED',
        },
      });

      if (canCommit && hasText(decision.budget.bucketId)) {
        const freshBucket = await ensureBucketFresh(decision.budget.bucketId, requestNow);
        if (freshBucket !== null && freshBucket.userId === userId) {
          await db.bucket.updateMany({
            where: { id: freshBucket.id, userId },
            data: { spentCents: (freshBucket.spentCents ?? 0) + body.amountCents },
          });
        } else {
          logGuardrailEvent({
            userId,
            surface: 'simulate',
            outcome: 'STOP',
            reason: 'BUCKET_STALE_OR_MISMATCH',
            detail: { bucketId: decision.budget.bucketId },
            timestamp: requestTimestamp,
            timestampSource: 'boundary',
          });
        }
      }

      return simTx;
    });

    return NextResponse.json({
      simulationId,
      transaction: tx,
      decision,
      authority: authorityDecision,
      committed: canCommit && !strictDecline,
    });
  } catch (caught: unknown) {
    const appError = asAppError(caught);
    if (isPrismaP2003(caught)) {
      const meta = asLogMeta((caught as { meta?: unknown }).meta);
      logInvariant('P2003 while processing simulate', { meta, err: caught });
      return NextResponse.json(
        { error: 'Failed to process simulation (FK violation)' },
        { status: 500 }
      );
    }
    if (isUnauthorized(appError)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    logError('Error in /api/simulate', appError);
    return NextResponse.json(
      { error: 'Failed to run simulation', ...(authorityDecision ? { authority: authorityDecision } : {}) },
      { status: 500 }
    );
  }
}
