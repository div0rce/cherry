import { NextRequest, NextResponse } from 'next/server';
import { TransactionStatus } from '@prisma/client';
import { getAutopilotDecisionForUserSwipe } from '@/lib/engine';
import { buildSwipeIdempotencyKey } from '@/lib/ids';
import { logGuardrailEvent, logInvariantViolation } from '@/lib/log';
import { prisma } from '@/lib/prisma';
import { AutopilotCommitRequest, AutopilotDecisionSchema } from '@/lib/schemas/autopilot';
import { parseJsonBody } from '@/lib/validation';
import { resolveUserContext } from '@/lib/user-context';
import { ensureBucketFresh } from '@/lib/buckets/ensure-fresh';
import { hasText } from '@/lib/text';
import {
  computeBucketBalance,
  computeBucketBalanceFromNumbers,
  deriveLegacyCurrentAmount,
  toBucketRuntime,
  type BucketRuntime,
} from '@/lib/buckets-runtime';
import { resolveScanCategory } from '@/lib/scan-helpers';

export async function POST(request: NextRequest): Promise<NextResponse> {
  let userId: string | null = null;
  try {
    const userContext = await resolveUserContext({ requireAuth: true, allowLabDemo: true });
    userId = userContext.userId;
    const currentUserId = userContext.userId;
    const parsed = await parseJsonBody(request, AutopilotCommitRequest);
    if (!parsed.ok) {
      logGuardrailEvent({
        surface: 'autopilot',
        userId,
        kind: 'INPUT_INVALID',
        severity: 'hard',
        reason: 'INVALID_PAYLOAD',
      });
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const body = parsed.data;
    const occurredAt = new Date(body.occurredAt);
    if (!Number.isFinite(occurredAt.getTime())) {
      logGuardrailEvent({
        surface: 'autopilot',
        userId,
        kind: 'INPUT_INVALID',
        severity: 'hard',
        reason: 'INVALID_PAYLOAD',
      });
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const cards = await prisma.card.findMany({
      where: { userId: currentUserId },
      select: { id: true, nickname: true },
      orderBy: { createdAt: 'asc' },
    });
    const cardUniverseIds = cards.map((card) => card.id);

    if (!cardUniverseIds.includes(body.cardId)) {
      logGuardrailEvent({
        surface: 'autopilot',
        userId,
        kind: 'INPUT_INVALID',
        severity: 'hard',
        reason: 'INVALID_CARD',
        detail: { cardId: body.cardId },
      });
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const autopilotDecision = await getAutopilotDecisionForUserSwipe({
      userId: currentUserId,
      merchant: body.merchant,
      amountCents: body.amountCents,
      cardUniverseIds,
    });

    const validatedDecision = AutopilotDecisionSchema.safeParse(autopilotDecision);
    if (!validatedDecision.success) {
      logInvariantViolation({
        surface: 'autopilot',
        detail: 'Autopilot decision validation failed in commit',
        data: validatedDecision.error.format(),
      });
      return NextResponse.json({ error: 'Failed to evaluate autopilot' }, { status: 500 });
    }

    const decision = validatedDecision.data;
    if (decision.kind !== 'OK') {
      logGuardrailEvent({
        surface: 'autopilot',
        userId,
        kind: 'DECISION_BLOCKED',
        severity: 'hard',
        reason: decision.reasonCode,
      });
      return NextResponse.json({ error: 'Unable to commit swipe', decision }, { status: 400 });
    }

    if (decision.cardId !== body.cardId) {
      logGuardrailEvent({
        surface: 'autopilot',
        userId,
        kind: 'DECISION_BLOCKED',
        severity: 'soft',
        reason: 'CARD_MISMATCH',
        detail: { expectedCardId: decision.cardId, receivedCardId: body.cardId },
      });
      return NextResponse.json({ error: 'Card mismatch for commit' }, { status: 400 });
    }

    const category = await resolveScanCategory({
      userId: currentUserId,
      merchantName: body.merchant,
      mccCode: null,
      explicitCategory: null,
    });

    let swipeIdempotencyKey: string;
    try {
      swipeIdempotencyKey = buildSwipeIdempotencyKey({
        userId: currentUserId,
        merchant: body.merchant,
        amountCents: body.amountCents,
        occurredAt,
      });
    } catch {
      logGuardrailEvent({
        surface: 'autopilot',
        userId,
        kind: 'INPUT_INVALID',
        severity: 'hard',
        reason: 'INVALID_IDEMPOTENCY',
      });
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    if (!hasText(swipeIdempotencyKey)) {
      logGuardrailEvent({
        surface: 'autopilot',
        userId,
        kind: 'INPUT_INVALID',
        severity: 'hard',
        reason: 'INVALID_IDEMPOTENCY',
      });
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const commitResult = await prisma.$transaction(async (tx) => {
      const existing = await tx.simulatedTransaction.findUnique({
        where: { id: swipeIdempotencyKey },
      });

      if (existing) {
        const existingBucketId = existing.bucketId;
        const hasExistingBucket =
          typeof existingBucketId === 'string' && existingBucketId !== '';
        const bucketId = hasExistingBucket ? existingBucketId : null;
        const bucket =
          bucketId !== null ? await ensureBucketFresh(bucketId, occurredAt, tx) : null;
        const runtimeBucket = bucket ? toBucketRuntime(bucket) : null;
        return { bucket: runtimeBucket, transactionId: existing.id };
      }

      const cardLabel =
        cards.find((card) => card.id === decision.cardId)?.nickname ??
        cards.find((card) => card.id === decision.cardId)?.id ??
        null;

      let bucketBefore: ReturnType<typeof computeBucketBalance> | null = null;
      let bucketAfter: ReturnType<typeof computeBucketBalance> | null = null;
      let updatedBucket: BucketRuntime | null = null;

      if (decision.bucketDelta) {
        const freshBucket = await ensureBucketFresh(decision.bucketDelta.bucketId, occurredAt, tx);
        if (freshBucket && freshBucket.userId === currentUserId) {
          bucketBefore = computeBucketBalance(freshBucket);
          const delta = decision.bucketDelta.newSpentCents - bucketBefore.committedCents;
          if (delta > 0) {
            const newSpent = freshBucket.spentCents + delta;
            const balanceAfter = computeBucketBalanceFromNumbers(
              freshBucket.budgetAmount,
              newSpent,
              0
            );
            const persisted = await tx.bucket.update({
              where: { id: freshBucket.id, userId: currentUserId },
              data: {
                spentCents: newSpent,
                currentAmount: deriveLegacyCurrentAmount(balanceAfter),
              },
            });
            updatedBucket = toBucketRuntime(persisted);
            bucketAfter = balanceAfter;
          } else {
            updatedBucket = toBucketRuntime(freshBucket);
            bucketAfter = bucketBefore;
          }
        }
      }

      const transaction = await tx.simulatedTransaction.create({
        data: {
          id: swipeIdempotencyKey,
          userId: currentUserId,
          amount: body.amountCents,
          merchantName: body.merchant,
          resolvedCategory: category,
          bucketId: updatedBucket?.id ?? decision.bucketDelta?.bucketId ?? null,
          bucketName: updatedBucket?.name ?? null,
          bucketPeriod: updatedBucket?.period ?? null,
          bucketBeforeCents: bucketBefore?.remainingCents ?? null,
          bucketAfterCents: bucketAfter?.remainingCents ?? null,
          bucketLimitCents: updatedBucket?.budgetAmount ?? null,
          chosenCardId: decision.cardId,
          chosenCardName: cardLabel,
          status: TransactionStatus.APPROVED,
          reason: 'AUTOPILOT_COMMIT',
          strictDecline: false,
        },
      });

      return { bucket: updatedBucket, transactionId: transaction.id };
    });

    const bucket = commitResult.bucket;

    return NextResponse.json({
      decision,
      bucket,
      idempotencyKey: swipeIdempotencyKey,
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    logInvariantViolation({
      surface: 'autopilot',
      detail: 'Autopilot commit failed unexpectedly',
      data: { userId, error: err instanceof Error ? err.message : 'UNKNOWN_ERROR' },
    });
    return NextResponse.json({ error: 'Failed to commit swipe' }, { status: 500 });
  }
}
