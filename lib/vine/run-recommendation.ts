import { randomUUID } from 'crypto';
import {
  CategoryCoverageModeDb,
  RecommendationStatus,
  RecommendationSource,
  SessionAnomalyCode,
  VerificationStatus,
} from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  recordDecisionEvent,
  simulateSpendAuthority,
  type SimulatedAuthorityDecision,
} from '@/lib/authority/simulateSpendAuthority';
import {
  buildEngineContext,
  mapSolverDecisionToLegacyDecision,
  safeSolveDecisionForUser,
  type LegacyEngineDecision,
} from '@/lib/engine';
import type { OrderContext } from './order-context';
import { validateEngineDecision } from '@/lib/engine-invariants';
import { assertUserId } from '@/lib/invariants';
import { isPrismaP2003, logInvariant } from '@/lib/user-context';
import type { RewardCategory } from '@prisma/client';

export async function runRecommendationFromOrderContext(
  ctx: OrderContext,
  userId: string
): Promise<{
  sessionId: string;
  orderToken: string;
  decision: LegacyEngineDecision;
  authority: SimulatedAuthorityDecision;
}> {
  assertUserId(userId);

  const timestamp = Number.isFinite(ctx.timestamp) ? ctx.timestamp : Date.now();
  const amountCents = Math.floor(ctx.amountCents);

  if (amountCents <= 0) {
    throw new Error('amountCents must be a positive integer');
  }

  const engineCtx = buildEngineContext({
    surface: 'vine',
    now: new Date(timestamp),
    merchantName: ctx.merchantName ?? null,
    merchantCategoryKey: null,
    mcc: ctx.mccCode != null ? String(ctx.mccCode) : null,
    amountCents,
  });

  const engineResult = await safeSolveDecisionForUser(userId, engineCtx, { maxCandidates: 64 });

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
  const authorityDecision = await simulateSpendAuthority(authorityParams);
  await recordDecisionEvent({
    userId,
    surface: 'vine',
    params: authorityParams,
    decision: authorityDecision,
  });

  const expiresAt = new Date(Math.max(timestamp, Date.now()) + 15 * 60 * 1000);
  const orderToken = ctx.nonce ?? randomUUID();
  const source: RecommendationSource =
    ctx.source === RecommendationSource.VINE_DEVICE
      ? RecommendationSource.VINE_DEVICE
      : RecommendationSource.VINE_SIM;

  try {
    const session = await prisma.recommendationSession.create({
      data: {
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
      select: { id: true },
    });

    return { sessionId: session.id, orderToken, decision, authority: authorityDecision };
  } catch (err: unknown) {
    asError(err);
    if (isPrismaP2003(err)) {
      logInvariant('FK failure in recommendationSession.create', {
        userId,
        meta: asLogMeta(err.meta),
        err,
      });
      throw new Error('Internal error: failed to persist recommendation session (FK violation)');
    }
    logInvariant('Error creating recommendation session from Vine', { userId, err });
    throw err;
  }
}
