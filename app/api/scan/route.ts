import { NextRequest, NextResponse } from 'next/server';
import {
  buildEngineContext,
  mapSolverDecisionToLegacyDecision,
  type LegacyEngineDecision,
} from '../../../lib/engine';
import { safeSolveDecisionForWorld } from '../../../lib/engine/run';
import { fromPrismaUserToEngineState } from '../../../lib/engine-state';
import { runEngine as runLegacyEngine } from '../../../lib/legacy-engine';
import { recordDecisionEvent, simulateSpendAuthority } from '../../../lib/adapters/runtime/authority.prisma';
import { buildPrismaWorld } from '../../../lib/adapters/runtime/world.prisma';
import type { SimulatedAuthorityDecision } from '../../../lib/authority/simulateSpendAuthority';
import { resolveScanCategory } from '../../../lib/scan-helpers';
import type { ScanResponseBody } from '../../../lib/scan-types';
import { logError } from '../../../lib/logger';
import { asAppError, isUnauthorized } from '../../../lib/errors';
import { ScanRequestSchema } from '../../../lib/schemas/scan';
import { parseJsonBody } from '../../../lib/validation';
import { validateEngineDecision } from '../../../lib/engine-invariants';
import { resolveUserContext } from '../../../lib/user-context';
import type { RewardCategory } from '@prisma/client';

const hasText = (value?: string | null): value is string =>
  value !== undefined && value !== null && value !== '';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = await resolveUserContext({ requireAuth: false, allowLabDemo: true });
    const parsed = await parseJsonBody(request, ScanRequestSchema);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;

    if (!hasText(body.merchantName)) {
      return NextResponse.json(
        { error: 'merchantName is required and must be a string' },
        { status: 400 }
      );
    }

    const category: RewardCategory = await resolveScanCategory({
      userId,
      merchantName: body.merchantName,
      mccCode: typeof body.mccCode === 'number' ? body.mccCode : null,
      explicitCategory: body.category ?? null,
    });

    const amountCents =
      typeof body.expectedAmountCents === 'number' &&
      Number.isFinite(body.expectedAmountCents) &&
      body.expectedAmountCents >= 0
        ? Math.floor(body.expectedAmountCents)
        : 0;

    const now = new Date();
    const nowMs = now.getTime();
    const world = buildPrismaWorld();

    let authorityDecision: SimulatedAuthorityDecision | null = null;
    try {
      const authorityParams = {
        userId,
        amountCents,
        category,
        surface: 'scan' as const,
        counterfactuals: [],
      };
      authorityDecision = await simulateSpendAuthority(authorityParams, { nowMs });
      await recordDecisionEvent({
        userId,
        surface: 'scan',
        params: authorityParams,
        decision: authorityDecision,
      });

      const ctx = buildEngineContext({
        surface: 'web',
        nowMs,
        merchantName: body.merchantName,
        merchantCategoryKey: category,
        mcc: typeof body.mccCode === 'number' ? String(body.mccCode) : null,
        amountCents,
      });

      const state = await fromPrismaUserToEngineState(userId, nowMs);
      const engineResult = await safeSolveDecisionForWorld(world, userId, ctx, {
        maxCandidates: 64,
        stateOverride: state,
        legacyDecisionProvider: runLegacyEngine,
      });

      if (!engineResult.ok) {
        return NextResponse.json(
          {
            error: {
              code: engineResult.reason,
              message: engineResult.message,
            },
            decision: null,
            authority: authorityDecision,
          },
          { status: 200 }
        );
      }

      const topDecision =
        engineResult.decisions.find(
          (d) => d.action.type === 'USE_CARD' || d.action.type === 'USE_CARD_WITH_PAYDOWN'
        ) ?? engineResult.decisions.at(0);
      const mappedDecision: LegacyEngineDecision | null = mapSolverDecisionToLegacyDecision({
        ...(topDecision ? { solverDecision: topDecision } : {}),
        state: engineResult.state,
        ctx,
        category,
        ...(engineResult.legacyDecision ? { fallback: engineResult.legacyDecision } : {}),
      });

      if (!mappedDecision) {
        return NextResponse.json(
          {
            error: { code: 'ENGINE_MAPPING', message: 'Unable to build decision' },
            decision: null,
            authority: authorityDecision,
          },
          { status: 200 }
        );
      }

      const decision: LegacyEngineDecision = mappedDecision;
      validateEngineDecision(decision);

      const bucket = decision.budget;
      const routing = decision.card;

      const response: ScanResponseBody = {
        merchantName: body.merchantName,
        category: decision.category,
        amountCents,
        bucket: {
          name: bucket.name ?? null,
          limitCents: bucket.limitCents ?? null,
          spentBeforeCents: bucket.spentBeforeCents ?? null,
          spentAfterCents: bucket.spentAfterCents ?? null,
          remainingAfterCents: bucket.remainingAfterCents ?? null,
          strictMode: bucket.strictMode ?? false,
          wouldExceed: bucket.wouldExceed ?? false,
          coverageMode: bucket.coverageMode,
          verdict: bucket.verdict,
        },
        cardRecommendation: {
          cardId: routing.cardId ?? null,
          cardNickname: routing.cardNickname ?? null,
          rewardMultiplier: routing.multiplier ?? null,
          estimatedRewards: routing.estimatedRewards ?? null,
          verdict: routing.verdict,
        },
        budgetVerdict: decision.budget.verdict,
        cardVerdict: decision.card.verdict,
        overallVerdict: decision.overallVerdict,
        cherryIncentive: decision.cherryIncentive,
        engineDecision: decision,
        authority: authorityDecision,
      };

      return NextResponse.json(response);
    } catch (error: unknown) {
      const appError = asAppError(error);
      logError('Error in /api/scan', appError);
      return NextResponse.json(
        {
          error: 'Failed to evaluate scan',
          ...(authorityDecision ? { authority: authorityDecision } : {}),
        },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    const appError = asAppError(error);
    if (isUnauthorized(appError)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    logError('Error in /api/scan', appError);
    return NextResponse.json({ error: 'Failed to evaluate scan' }, { status: 500 });
  }
}
