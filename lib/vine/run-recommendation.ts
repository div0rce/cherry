import { randomUUID } from 'crypto';
import { RecommendationStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { runEngine } from '@/lib/engine';
import type { EngineDecision } from '@/lib/engine';
import type { OrderContext } from './order-context';

export async function runRecommendationFromOrderContext(
  ctx: OrderContext,
  userId: string
): Promise<{ sessionId: string; orderToken: string; decision: EngineDecision }> {
  const timestamp = Number.isFinite(ctx.timestamp) ? ctx.timestamp : Date.now();
  const amountCents = Math.floor(ctx.amountCents);

  if (!amountCents || amountCents <= 0) {
    throw new Error('amountCents must be a positive integer');
  }

  const decision = await runEngine({
    userId,
    amountCents,
    merchantName: ctx.merchantName ?? null,
    mccCode: ctx.mccCode ?? undefined,
    category: null,
    now: new Date(timestamp),
  });

  const expiresAt = new Date(Math.max(timestamp, Date.now()) + 15 * 60 * 1000);
  const orderToken = ctx.nonce ?? randomUUID();

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
      recommendedCardId: decision.routing.chosenCardId,
      recommendedBucketId: decision.bucket.id,
      verdict: decision.verdict,
      cherryPointsOffered: decision.cherryIncentive.pointsIfFollowed,
      status: RecommendationStatus.RECOMMENDED,
      expiresAt,
    },
    select: { id: true },
  });

  return { sessionId: session.id, orderToken, decision };
}
