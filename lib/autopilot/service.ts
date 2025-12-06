import { TransactionStatus } from '@prisma/client';
import type { AutopilotDecision } from '@/lib/engine/public-types';
import { getAutopilotDecisionForUserSwipe as runEngineAutopilot } from '@/lib/engine';
import { buildSwipeIdempotencyKey } from '@/lib/ids';
import { logInvariantViolation } from '@/lib/log';
import { prisma } from '@/lib/prisma';
import { resolveScanCategory } from '@/lib/scan-helpers';
import { ensureBucketFresh } from '@/lib/buckets/ensure-fresh';
import {
  computeBucketBalance,
  computeBucketBalanceFromNumbers,
  deriveLegacyCurrentAmount,
  toBucketRuntime,
  type BucketRuntime,
} from '@/lib/buckets-runtime';
import { hasText } from '@/lib/text';
import type {
  AutopilotBucketImpact,
  AutopilotCommitInput,
  AutopilotCommitResult,
  AutopilotDecisionStatus,
  AutopilotPreviewInput,
  AutopilotPreviewOutput,
  AutopilotRecommendedCard,
} from './types';
import { AutopilotServiceError } from './types';

type CardSummary = {
  id: string;
  nickname: string;
  issuer: string | null;
  network: string | null;
};

type EvaluatedAutopilotContext = {
  merchant: string;
  amountCents: number;
  occurredAt: Date;
  decision: AutopilotDecision;
  decisionId: string;
  status: AutopilotDecisionStatus;
  expectedBenefitCents: number;
  bucketImpact: AutopilotBucketImpact | null;
  bucketName: string | null;
  recommendedCard: CardSummary | null;
  cards: CardSummary[];
};

function parseOccurredAt(raw?: string): Date {
  if (raw === undefined) return new Date();
  const date = new Date(raw);
  if (!Number.isFinite(date.getTime())) {
    throw new AutopilotServiceError('Invalid occurredAt timestamp', 400, 'INVALID_OCCURRED_AT');
  }
  return date;
}

function mapKindToStatus(kind: AutopilotDecision['kind']): AutopilotDecisionStatus {
  if (kind === 'BLOCKED') return 'blocked';
  if (kind === 'FALLBACK') return 'fallback';
  return 'ok';
}

function toRecommendedCard(card: CardSummary | null): AutopilotRecommendedCard | null {
  if (!card) return null;
  return {
    id: card.id,
    label: card.nickname,
    issuer: card.issuer,
    network: card.network,
  };
}

async function evaluateAutopilot(
  userId: string,
  input: AutopilotPreviewInput
): Promise<EvaluatedAutopilotContext> {
  if (!hasText(userId)) {
    throw new AutopilotServiceError('User is required', 400, 'INVALID_USER');
  }

  const merchant = input.merchant.trim();
  if (!hasText(merchant)) {
    throw new AutopilotServiceError('Merchant is required', 400, 'INVALID_MERCHANT');
  }

  const amountCents = Math.round(input.amountCents);
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    throw new AutopilotServiceError('Amount must be positive', 400, 'INVALID_AMOUNT');
  }

  const occurredAt = parseOccurredAt(input.occurredAt);

  const cards = await prisma.card.findMany({
    where: { userId },
    select: { id: true, nickname: true, issuer: true, network: true },
    orderBy: { createdAt: 'asc' },
  });
  const cardUniverseIds = cards.map((card) => card.id);

  let decision: AutopilotDecision;
  try {
    decision = await runEngineAutopilot({
      userId,
      merchant,
      amountCents,
      cardUniverseIds,
    });
  } catch (error) {
    throw new AutopilotServiceError(
      'Unable to evaluate Autopilot right now',
      500,
      'ENGINE_ERROR',
      error instanceof Error ? error.message : 'UNKNOWN_ENGINE_ERROR'
    );
  }

  const status = mapKindToStatus(decision.kind);
  const recommendedCard =
    decision.cardId !== null ? cards.find((card) => card.id === decision.cardId) ?? null : null;

  let bucketName: string | null = null;
  let bucketImpact: AutopilotBucketImpact | null = null;
  if (decision.bucketDelta) {
    const bucket = await prisma.bucket.findUnique({
      where: { id: decision.bucketDelta.bucketId, userId },
      select: { name: true },
    });
    bucketName = bucket?.name ?? null;
    bucketImpact = {
      bucketId: decision.bucketDelta.bucketId,
      name: bucketName,
      remainingCents: decision.bucketDelta.newRemainingCents ?? null,
      spentCents: decision.bucketDelta.newSpentCents ?? null,
    };
  }

  const expectedBenefitCents = Math.max(0, decision.expectedMonetaryBenefitCents ?? 0);

  let decisionId: string;
  try {
    decisionId = buildSwipeIdempotencyKey({
      userId,
      merchant,
      amountCents,
      occurredAt,
    });
  } catch (error) {
    throw new AutopilotServiceError(
      'Unable to build decision fingerprint',
      400,
      'INVALID_IDEMPOTENCY',
      error instanceof Error ? error.message : 'INVALID_ID'
    );
  }

  return {
    merchant,
    amountCents,
    occurredAt,
    decision,
    decisionId,
    status,
    expectedBenefitCents,
    bucketImpact,
    bucketName,
    recommendedCard,
    cards,
  };
}

export async function getAutopilotDecisionForUserSwipe(
  userId: string,
  input: AutopilotPreviewInput
): Promise<AutopilotPreviewOutput> {
  const evaluation = await evaluateAutopilot(userId, input);
  const recommendedCard = toRecommendedCard(evaluation.recommendedCard);

  const explanation = {
    primary: evaluation.decision.userFacingMessage,
    secondary: [] as string[],
    warnings: [] as string[],
  };

  if (recommendedCard) {
    explanation.secondary.push(`Top card: ${recommendedCard.label}`);
  }
  if (evaluation.expectedBenefitCents > 0) {
    explanation.secondary.push(
      `Estimated +$${(evaluation.expectedBenefitCents / 100).toFixed(2)} vs your next best card`
    );
  }
  const bucketImpact = evaluation.bucketImpact;
  if (bucketImpact !== null && bucketImpact.remainingCents !== null) {
    const name = bucketImpact.name ?? 'budget';
    const dollars = (bucketImpact.remainingCents / 100).toFixed(2);
    explanation.secondary.push(`Keeps ${name} at $${dollars} remaining`);
    if (bucketImpact.remainingCents <= 0) {
      explanation.warnings.push('This swipe would exhaust its budget.');
    }
  }
  if (evaluation.status !== 'ok') {
    explanation.warnings.push('Cherry could not approve this swipe safely.');
  }

  return {
    decisionId: evaluation.decisionId,
    merchant: evaluation.merchant,
    amountCents: evaluation.amountCents,
    occurredAt: evaluation.occurredAt.toISOString(),
    status: evaluation.status,
    recommendedCard,
    expectedBenefitCents: evaluation.expectedBenefitCents,
    explanation,
    bucketImpact: evaluation.bucketImpact,
    reasonCode: evaluation.decision.reasonCode,
  };
}

export async function commitAutopilotDecision(
  userId: string,
  input: AutopilotCommitInput
): Promise<AutopilotCommitResult> {
  const evaluation = await evaluateAutopilot(userId, {
    merchant: input.merchant,
    amountCents: input.amountCents,
    occurredAt: input.occurredAt,
    category: input.category,
  });

  if (evaluation.decisionId !== input.decisionId) {
    throw new AutopilotServiceError('Decision fingerprint mismatch', 400, 'DECISION_MISMATCH');
  }

  if (evaluation.status !== 'ok') {
    throw new AutopilotServiceError('Autopilot could not approve this swipe', 400, 'DECISION_BLOCKED');
  }

  const recommendedCard = evaluation.recommendedCard;
  if (recommendedCard === null) {
    throw new AutopilotServiceError('Card does not match the current recommendation', 400, 'CARD_MISMATCH');
  }

  if (recommendedCard.id !== input.cardId) {
    throw new AutopilotServiceError('Card does not match the current recommendation', 400, 'CARD_MISMATCH');
  }

  const resolvedCategory = await resolveScanCategory({
    userId,
    merchantName: evaluation.merchant,
    mccCode: null,
    explicitCategory: input.category ?? null,
  });

  const cardLabel = recommendedCard.nickname ?? recommendedCard.id ?? input.cardId;

  const commitResult = await prisma.$transaction(async (tx) => {
    const existing = await tx.simulatedTransaction.findUnique({
      where: { id: evaluation.decisionId },
    });

    if (existing) {
      const bucket =
        typeof existing.bucketId === 'string'
          ? await ensureBucketFresh(existing.bucketId, evaluation.occurredAt, tx)
          : null;
      return {
        status: 'already_exists' as const,
        transactionId: existing.id,
        bucket: bucket ? toBucketRuntime(bucket) : null,
      };
    }

    let bucketBefore: ReturnType<typeof computeBucketBalance> | null = null;
    let bucketAfter: ReturnType<typeof computeBucketBalance> | null = null;
    let runtimeBucket: BucketRuntime | null = null;

    if (evaluation.decision.bucketDelta) {
      const freshBucket = await ensureBucketFresh(
        evaluation.decision.bucketDelta.bucketId,
        evaluation.occurredAt,
        tx
      );

      if (freshBucket && freshBucket.userId === userId) {
        bucketBefore = computeBucketBalance(freshBucket);
        const delta = evaluation.decision.bucketDelta.newSpentCents - bucketBefore.committedCents;

        if (delta > 0) {
          const newSpent = freshBucket.spentCents + delta;
          const balanceAfter = computeBucketBalanceFromNumbers(freshBucket.budgetAmount, newSpent, 0);
          const persisted = await tx.bucket.update({
            where: { id: freshBucket.id, userId },
            data: {
              spentCents: newSpent,
              currentAmount: deriveLegacyCurrentAmount(balanceAfter),
            },
          });
          runtimeBucket = toBucketRuntime(persisted);
          bucketAfter = balanceAfter;
        } else {
          runtimeBucket = toBucketRuntime(freshBucket);
          bucketAfter = bucketBefore;
        }
      } else {
        logInvariantViolation({
          surface: 'autopilot',
          detail: 'Bucket delta referenced missing or foreign bucket',
          data: { bucketId: evaluation.decision.bucketDelta.bucketId, userId },
        });
      }
    }

    const transaction = await tx.simulatedTransaction.create({
      data: {
        id: evaluation.decisionId,
        userId,
        amount: evaluation.amountCents,
        merchantName: evaluation.merchant,
        resolvedCategory,
        bucketId: runtimeBucket?.id ?? evaluation.decision.bucketDelta?.bucketId ?? null,
        bucketName: runtimeBucket?.name ?? evaluation.bucketName ?? null,
        bucketPeriod: runtimeBucket?.period ?? null,
        bucketBeforeCents: bucketBefore?.remainingCents ?? null,
        bucketAfterCents: bucketAfter?.remainingCents ?? null,
        bucketLimitCents: runtimeBucket?.budgetAmount ?? null,
        chosenCardId: recommendedCard.id,
        chosenCardName: cardLabel,
        status: TransactionStatus.APPROVED,
        reason: 'AUTOPILOT_COMMIT',
        strictDecline: false,
      },
    });

    return { status: 'created' as const, transactionId: transaction.id, bucket: runtimeBucket };
  });

  return {
    decisionId: evaluation.decisionId,
    transactionId: commitResult.transactionId,
    bucket: commitResult.bucket,
    status: commitResult.status,
  };
}
