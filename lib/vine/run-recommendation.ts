import {
  CategoryCoverageModeDb,
  RecommendationStatus,
  RecommendationSource,
  SessionAnomalyCode,
  VerificationStatus,
} from '@prisma/client';
import { prisma } from '../prisma';
import { recordDecisionEvent, simulateSpendAuthority } from '../adapters/runtime/authority.prisma';
import type { SimulatedAuthorityDecision } from '../authority/simulateSpendAuthority';
import {
  buildEngineContext,
  mapSolverDecisionToLegacyDecision,
  type LegacyEngineDecision,
} from '../engine';
import { safeSolveDecisionForWorld } from '../engine/run';
import { fromPrismaUserToEngineState } from '../engine-state';
import { runEngine as runLegacyEngine } from '../legacy-engine';
import type { World } from '../adapters/world';
import type { OrderContext } from './order-context';
import { validateEngineDecision } from '../engine-invariants';
import { assertUserId } from '../invariants';
import { isPrismaP2003, logInvariant } from '../user-context';
import type { RewardCategory } from '@prisma/client';
import { deriveOrderToken } from './order-token';
import { assertStableId } from '../identity/hash';
import { AppError, asAppError } from '../errors';

export async function runRecommendationFromOrderContext(
  world: World,
  ctx: OrderContext,
  userId: string,
  options: { now: Date }
): Promise<{
  sessionId: string;
  orderToken: string;
  decision: LegacyEngineDecision;
  authority: SimulatedAuthorityDecision;
}> {
  assertUserId(userId);

  const fallbackTimestamp = options.now.getTime();
  const timestamp = Number.isFinite(ctx.timestamp) ? ctx.timestamp : fallbackTimestamp;
  const engineNowMs = timestamp;
  const amountCents = Math.floor(ctx.amountCents);

  if (amountCents <= 0) {
    throw new Error('amountCents must be a positive integer');
  }

  const engineCtx = buildEngineContext({
    surface: 'vine',
    nowMs: engineNowMs,
    merchantName: ctx.merchantName ?? null,
    merchantCategoryKey: null,
    mcc: ctx.mccCode != null ? String(ctx.mccCode) : null,
    amountCents,
  });

  const state = await fromPrismaUserToEngineState(userId, engineNowMs);
  const engineResult = await safeSolveDecisionForWorld(world, userId, engineCtx, {
    maxCandidates: 64,
    stateOverride: state,
    legacyDecisionProvider: runLegacyEngine,
  });

  if (!engineResult.ok || engineResult.decisions.length === 0) {
    throw new Error(engineResult.ok ? 'No viable decisions' : engineResult.message);
  }

  const topDecision =
    engineResult.decisions.find(
      (d) => d.action.type === 'USE_CARD' || d.action.type === 'USE_CARD_WITH_PAYDOWN'
    ) ?? engineResult.decisions.at(0);

  const mappedDecision: LegacyEngineDecision | null = mapSolverDecisionToLegacyDecision({
    ...(topDecision ? { solverDecision: topDecision } : {}),
    state: engineResult.state,
    ctx: engineCtx,
    category: (engineResult.legacyDecision?.category as RewardCategory | undefined) ?? 'OTHER',
    ...(engineResult.legacyDecision ? { fallback: engineResult.legacyDecision } : {}),
  });

  if (!mappedDecision) {
    throw new Error('Unable to map solver decision');
  }

  validateEngineDecision(mappedDecision);
  const decision: LegacyEngineDecision = mappedDecision;

  const authorityParams = {
    userId,
    amountCents,
    category: decision.category,
    surface: 'vine' as const,
    counterfactuals: [],
  };
  const authorityDecision = await simulateSpendAuthority(authorityParams, { nowMs: engineNowMs });
  await recordDecisionEvent({
    userId,
    surface: 'vine',
    params: authorityParams,
    decision: authorityDecision,
  });

  const expiresAt = new Date(Math.max(timestamp, options.now.getTime()) + 15 * 60 * 1000);
  const derivedOrderToken =
    ctx.nonce ??
    ctx.orderId ??
    deriveOrderToken({
      userId,
      amountCents,
      mccCode: ctx.mccCode ?? null,
      merchantName: ctx.merchantName ?? null,
      timestamp,
      deviceId: ctx.deviceId ?? null,
      terminalId: ctx.terminalId ?? null,
      storeId: ctx.storeId ?? null,
      orderId: ctx.orderId ?? null,
      nonce: ctx.nonce ?? null,
    });
  if (ctx.nonce == null && ctx.orderId == null) {
    assertStableId(derivedOrderToken);
  }
  const orderToken = derivedOrderToken;
  const source: RecommendationSource =
    ctx.source === RecommendationSource.VINE_DEVICE
      ? RecommendationSource.VINE_DEVICE
      : RecommendationSource.VINE_SIM;

  try {
    const session = await prisma.recommendationSession.upsert({
      where: { orderToken },
      create: {
        userId,
        merchantName: ctx.merchantName ?? null,
        mccCode: ctx.mccCode ?? null,
        category: decision.category,
        amountCents,
        currency: ctx.currency ?? 'USD',
        deviceId: ctx.deviceId,
        storeId: ctx.storeId ?? null,
        terminalId: ctx.terminalId ?? null,
        orderId: ctx.orderId ?? null,
        orderToken,
        source,
        recommendedCardId: decision.card.cardId ?? null,
        recommendedBucketId: decision.budget.bucketId ?? null,
        verdict:
          decision.budget.verdict === 'BREAKS_BUDGET'
            ? 'BREAKS_BUDGET'
            : decision.budget.verdict === 'BORDERLINE'
              ? 'BORDERLINE'
              : 'HEALTHY',
        budgetVerdict: decision.budget.verdict,
        cardVerdict: decision.card.verdict,
        overallVerdict: decision.overallVerdict,
        coverageMode: (decision.budget.coverageMode ?? 'UNCONFIGURED') as CategoryCoverageModeDb,
        cherryPointsOffered: decision.cherryIncentive.pointsIfFollowed,
        status: RecommendationStatus.RECOMMENDED,
        verificationStatus: VerificationStatus.UNVERIFIED,
        anomalyCode: SessionAnomalyCode.NONE,
        anomalyDetails: null,
        expiresAt,
      },
      update: {
        expiresAt,
        status: RecommendationStatus.RECOMMENDED,
        verificationStatus: VerificationStatus.UNVERIFIED,
      },
      select: { id: true },
    });

    return { sessionId: session.id, orderToken, decision, authority: authorityDecision };
  } catch (err: unknown) {
    const appError = asAppError(err);
    if (isPrismaP2003(err)) {
      logInvariant('FK failure in recommendationSession.create', { userId, err });
      throw new AppError(
        'INTERNAL',
        'Internal error: failed to persist recommendation session (FK violation)',
        500
      );
    }
    logInvariant('Error creating recommendation session from Vine', { userId, err: appError });
    throw appError;
  }
}
