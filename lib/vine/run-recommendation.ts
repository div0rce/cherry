import { randomUUID } from 'crypto';
import {
  CategoryCoverageModeDb,
  RecommendationStatus,
  RecommendationSource,
  SessionAnomalyCode,
  VerificationStatus,
} from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { runEngine } from '@/lib/engine';
import type { EngineDecision } from '@/lib/engine';
import type { OrderContext } from './order-context';
import { validateEngineDecision } from '@/lib/engine-invariants';
import { assertUserId } from '@/lib/invariants';
import { logInvariant } from '@/lib/logging';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

export async function runRecommendationFromOrderContext(
  ctx: OrderContext,
  userId: string
): Promise<{ sessionId: string; orderToken: string; decision: EngineDecision }> {
  assertUserId(userId);

  const timestamp = Number.isFinite(ctx.timestamp) ? ctx.timestamp : Date.now();
  const amountCents = Math.floor(ctx.amountCents);

  if (amountCents <= 0) {
    throw new Error('amountCents must be a positive integer');
  }

  const decision = await runEngine({
    userId,
    amountCents,
    merchantName: ctx.merchantName ?? null,
    mccCode: ctx.mccCode ?? null,
    category: null,
    now: new Date(timestamp),
  });
  validateEngineDecision(decision);

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

    return { sessionId: session.id, orderToken, decision };
  } catch (err) {
    if (err instanceof PrismaClientKnownRequestError && err.code === 'P2003') {
      logInvariant('FK failure in recommendationSession.create', {
        code: err.code,
        meta: err.meta ?? null,
      });
      throw new Error('Internal error: failed to persist recommendation session (FK violation)');
    }
    throw err;
  }
}
