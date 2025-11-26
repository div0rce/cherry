import { RewardCategory } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { EvaluateTransactionResult } from '@/lib/engine';
import type { SpendingVerdict } from '@/lib/scan-types';

export async function inferCategoryForMerchant(userId: string, merchantName: string) {
  const lastTx = await prisma.simulatedTransaction.findFirst({
    where: { userId, merchantName },
    orderBy: { createdAt: 'desc' },
    select: { resolvedCategory: true },
  });

  if (lastTx?.resolvedCategory) return lastTx.resolvedCategory;

  return RewardCategory.OTHER;
}

export function classifySpendingVerdict(decision: EvaluateTransactionResult): SpendingVerdict {
  const b = decision.bucket;

  if (!b.id || b.limitCents == null || b.willBeSpentCents == null) {
    return 'HEALTHY';
  }

  const overBy = b.willBeSpentCents - b.limitCents;

  if (b.strictDecline || overBy > 0) {
    return 'BREAKS_BUDGET';
  }

  if (b.remainingAfterCents != null && b.limitCents != null && b.limitCents > 0) {
    const ratio = b.remainingAfterCents / b.limitCents;
    if (ratio < 0.1) return 'BORDERLINE';
  }

  return 'HEALTHY';
}

export function computeCherryIncentive(
  decision: EvaluateTransactionResult,
  verdict: SpendingVerdict
): { pointsIfFollowed: number; expiryMinutes: number } {
  const amount = decision.bucket.willBeSpentCents ?? 0;
  const base = Math.min(Math.floor(amount / 1000), 20); // 0-20 base points

  let multiplier = 1;
  if (verdict === 'HEALTHY') multiplier = 2;
  else if (verdict === 'BORDERLINE') multiplier = 1;
  else if (verdict === 'BREAKS_BUDGET') multiplier = 0;

  const points = base * multiplier;

  return {
    pointsIfFollowed: points,
    expiryMinutes: 15,
  };
}
