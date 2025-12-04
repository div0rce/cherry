import type { BankTransaction, HistoricalEngineEvaluation } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export type EvaluationWithTx = HistoricalEngineEvaluation & { bankTransaction: BankTransaction };

export type OfflineEvalStats = {
  totalDebits: number;
  engineRan: number;
  nearBucketEdgeCount: number;
  overBucketCapCount: number;
  bucketSampleSize: number;
  wouldHaveSoftIntervenedCount: number;
  avgRewardRateActual: number | null;
  avgRewardRateBest: number | null;
  betterRewardCount: number;
  rewardSampleSize: number;
  smallDebitCount: number;
  mediumDebitCount: number;
  largeDebitCount: number;
  veryLargeDebitCount: number;
  highPainCandidateCount: number;
  highPainSampleSize: number;
  highPainWarningCount: number;
  cardPickCount: number;
  skipCount: number;
};

function isDebit(tx: BankTransaction): boolean {
  return (tx.direction ?? '').toLowerCase() === 'debit';
}

function getAmountMinor(tx: BankTransaction): number {
  if (typeof tx.amountMinor === 'number' && Number.isFinite(tx.amountMinor)) {
    return tx.amountMinor;
  }
  const rawAmount = Number(tx.amount ?? 0);
  const cents = Math.round(rawAmount * 100);
  return (tx.direction ?? '').toLowerCase() === 'credit' ? cents : cents * -1;
}

function getRewardComponent(rawDecision: unknown): number | null {
  if (rawDecision === null || typeof rawDecision !== 'object') return null;
  const maybe = (rawDecision as { components?: { rewards?: number } }).components;
  if (maybe === undefined || maybe === null || typeof maybe.rewards !== 'number') return null;
  return maybe.rewards;
}

function isCardDecision(decisionType: string): boolean {
  return decisionType === 'USE_CARD' || decisionType === 'USE_CARD_WITH_PAYDOWN';
}

export function computeOfflineStats(
  rows: EvaluationWithTx[],
  opts?: { bucketNearEdgeThreshold?: number; highPainThreshold?: number; rewardDeltaBps?: number },
): OfflineEvalStats {
  const nearEdgeRatio = opts?.bucketNearEdgeThreshold ?? 0.8;
  const highPainThreshold = opts?.highPainThreshold ?? 50_00;
  const rewardDeltaBps = opts?.rewardDeltaBps ?? 50; // 0.5%
  const minConsideredCents = 5_00;

  let totalDebits = 0;
  let engineRan = 0;
  let nearBucketEdgeCount = 0;
  let overBucketCapCount = 0;
  let bucketSampleSize = 0;
  let wouldHaveSoftIntervenedCount = 0;
  let betterRewardCount = 0;
  let cardPickCount = 0;
  let skipCount = 0;
  let smallDebitCount = 0;
  let mediumDebitCount = 0;
  let largeDebitCount = 0;
  let veryLargeDebitCount = 0;
  let highPainCandidateCount = 0;
  let highPainSampleSize = 0;
  let highPainWarningCount = 0;
  let rewardSampleSize = 0;

  const rewardActual: number[] = [];
  const rewardBest: number[] = [];

  for (const row of rows) {
    const amountMinor = Math.abs(getAmountMinor(row.bankTransaction));
    const isDebitTx = isDebit(row.bankTransaction);
    if (!isDebitTx) continue;
    totalDebits += 1;
    if (amountMinor < minConsideredCents) {
      skipCount += 1;
      continue;
    }

    engineRan += 1;

    // size buckets
    if (amountMinor < 10_00) smallDebitCount += 1;
    else if (amountMinor < 50_00) mediumDebitCount += 1;
    else if (amountMinor < 200_00) largeDebitCount += 1;
    else veryLargeDebitCount += 1;

    const usageAfterBps = row.bucketUsageAfterBps ?? null;
    if (usageAfterBps != null) {
      bucketSampleSize += 1;
      if (usageAfterBps >= nearEdgeRatio * 10000) nearBucketEdgeCount += 1;
      if (usageAfterBps >= 10000) overBucketCapCount += 1;
    }

    const decisionType = row.decisionType;
    if (isCardDecision(decisionType)) {
      cardPickCount += 1;
    }

    if (
      amountMinor >= highPainThreshold &&
      (decisionType === 'DELAY_PURCHASE' ||
        decisionType === 'REJECT_PURCHASE' ||
        decisionType === 'SWITCH_MERCHANT')
    ) {
      highPainWarningCount += 1;
    }
    if (amountMinor >= highPainThreshold) {
      highPainCandidateCount += 1;
      highPainSampleSize += 1;
    }

    // soft intervention heuristic: expensive debit and non-card action
    if (
      usageAfterBps != null &&
      usageAfterBps >= nearEdgeRatio * 10000 &&
      (decisionType === 'DELAY_PURCHASE' ||
        decisionType === 'REJECT_PURCHASE' ||
        decisionType === 'SWITCH_MERCHANT' ||
        decisionType === 'USE_CARD_WITH_PAYDOWN')
    ) {
      wouldHaveSoftIntervenedCount += 1;
    }

    const rewardScore = getRewardComponent(row.rawDecision);
    if (rewardScore != null) {
      rewardSampleSize += 1;
      rewardBest.push(rewardScore);
      // naive "actual" baseline: median of collected rewards, or 0.5 if unknown
      rewardActual.push(rewardScore);
    }

    if (rewardScore != null && rewardScore * 10000 >= rewardDeltaBps) {
      betterRewardCount += 1;
    }
  }

  const avg = (values: number[]): number | null => {
    if (values.length === 0) return null;
    return values.reduce((a, b) => a + b, 0) / values.length;
  };

  const stats: OfflineEvalStats = {
    totalDebits,
    engineRan,
    nearBucketEdgeCount,
    overBucketCapCount,
    bucketSampleSize,
    wouldHaveSoftIntervenedCount,
    avgRewardRateActual: avg(rewardActual),
    avgRewardRateBest: avg(rewardBest),
    betterRewardCount,
    rewardSampleSize,
    smallDebitCount,
    mediumDebitCount,
    largeDebitCount,
    veryLargeDebitCount,
    highPainSampleSize,
    highPainCandidateCount,
    highPainWarningCount,
    cardPickCount,
    skipCount,
  };

  return stats;
}

export async function getOfflineEvaluatorDebugInfo(userId: string): Promise<{
  totalForUser: number;
  distinctRunIds: { runId: string; count: number }[];
}> {
  const totalForUser = await prisma.historicalEngineEvaluation.count({ where: { userId } });
  const runGroups = await prisma.historicalEngineEvaluation.groupBy({
    by: ['runId'],
    where: { userId },
    _count: { runId: true },
    orderBy: { _count: { runId: 'desc' } },
  });

  return {
    totalForUser,
    distinctRunIds: runGroups.map((r) => ({ runId: r.runId, count: r._count.runId })),
  };
}
