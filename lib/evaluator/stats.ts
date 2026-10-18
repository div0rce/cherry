import type { BankTransaction, HistoricalEngineEvaluation } from '@prisma/client';
import { prisma } from '../prisma.js';

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
  return typeof maybe?.rewards === 'number' ? maybe.rewards : null;
}

function isCardDecision(decisionType: string): boolean {
  return decisionType === 'USE_CARD' || decisionType === 'USE_CARD_WITH_PAYDOWN';
}

const HIGH_PAIN_WARNING_DECISIONS: readonly string[] = ['DELAY_PURCHASE', 'REJECT_PURCHASE', 'SWITCH_MERCHANT'];
const SOFT_INTERVENTION_DECISIONS: readonly string[] = [...HIGH_PAIN_WARNING_DECISIONS, 'USE_CARD_WITH_PAYDOWN'];

type StatsCounters = Omit<OfflineEvalStats, 'avgRewardRateActual' | 'avgRewardRateBest'>;

type StatsSettings = {
  nearEdgeRatio: number;
  highPainThreshold: number;
  rewardDeltaBps: number;
};

const MIN_CONSIDERED_CENTS = 5_00;

function emptyCounters(): StatsCounters {
  return {
    totalDebits: 0,
    engineRan: 0,
    nearBucketEdgeCount: 0,
    overBucketCapCount: 0,
    bucketSampleSize: 0,
    wouldHaveSoftIntervenedCount: 0,
    betterRewardCount: 0,
    rewardSampleSize: 0,
    smallDebitCount: 0,
    mediumDebitCount: 0,
    largeDebitCount: 0,
    veryLargeDebitCount: 0,
    highPainSampleSize: 0,
    highPainCandidateCount: 0,
    highPainWarningCount: 0,
    cardPickCount: 0,
    skipCount: 0,
  };
}

function countSizeBucket(c: StatsCounters, amountMinor: number): void {
  if (amountMinor < 10_00) c.smallDebitCount += 1;
  else if (amountMinor < 50_00) c.mediumDebitCount += 1;
  else if (amountMinor < 200_00) c.largeDebitCount += 1;
  else c.veryLargeDebitCount += 1;
}

function isNearEdge(usageAfterBps: number | null, settings: StatsSettings): boolean {
  return usageAfterBps != null && usageAfterBps >= settings.nearEdgeRatio * 10000;
}

function countBucketUsage(c: StatsCounters, usageAfterBps: number | null, settings: StatsSettings): void {
  if (usageAfterBps == null) return;
  c.bucketSampleSize += 1;
  if (isNearEdge(usageAfterBps, settings)) c.nearBucketEdgeCount += 1;
  if (usageAfterBps >= 10000) c.overBucketCapCount += 1;
}

function countHighPain(c: StatsCounters, amountMinor: number, decisionType: string, settings: StatsSettings): void {
  if (amountMinor < settings.highPainThreshold) return;
  if (HIGH_PAIN_WARNING_DECISIONS.includes(decisionType)) c.highPainWarningCount += 1;
  c.highPainCandidateCount += 1;
  c.highPainSampleSize += 1;
}

function countRewards(
  c: StatsCounters,
  rewardScores: number[],
  rawDecision: unknown,
  settings: StatsSettings,
): void {
  const rewardScore = getRewardComponent(rawDecision);
  if (rewardScore == null) return;
  c.rewardSampleSize += 1;
  rewardScores.push(rewardScore);
  if (rewardScore * 10000 >= settings.rewardDeltaBps) c.betterRewardCount += 1;
}

type StatsRun = { counters: StatsCounters; rewardScores: number[]; settings: StatsSettings };

function countEngineRow(run: StatsRun, row: EvaluationWithTx, amountMinor: number): void {
  const { counters: c, rewardScores, settings } = run;
  c.engineRan += 1;
  countSizeBucket(c, amountMinor);

  const usageAfterBps = row.bucketUsageAfterBps ?? null;
  countBucketUsage(c, usageAfterBps, settings);

  const decisionType = row.decisionType;
  if (isCardDecision(decisionType)) c.cardPickCount += 1;
  countHighPain(c, amountMinor, decisionType, settings);

  // soft intervention heuristic: expensive debit and non-card action
  if (isNearEdge(usageAfterBps, settings) && SOFT_INTERVENTION_DECISIONS.includes(decisionType)) {
    c.wouldHaveSoftIntervenedCount += 1;
  }

  countRewards(c, rewardScores, row.rawDecision, settings);
}

function avg(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function computeOfflineStats(
  rows: EvaluationWithTx[],
  opts?: { bucketNearEdgeThreshold?: number; highPainThreshold?: number; rewardDeltaBps?: number },
): OfflineEvalStats {
  const settings: StatsSettings = {
    nearEdgeRatio: opts?.bucketNearEdgeThreshold ?? 0.8,
    highPainThreshold: opts?.highPainThreshold ?? 50_00,
    rewardDeltaBps: opts?.rewardDeltaBps ?? 50, // 0.5%
  };
  const counters = emptyCounters();
  // naive "actual" baseline: same collected rewards as "best"
  const rewardScores: number[] = [];

  for (const row of rows) {
    if (!isDebit(row.bankTransaction)) continue;
    const amountMinor = Math.abs(getAmountMinor(row.bankTransaction));
    counters.totalDebits += 1;
    if (amountMinor < MIN_CONSIDERED_CENTS) {
      counters.skipCount += 1;
      continue;
    }
    countEngineRow({ counters, rewardScores, settings }, row, amountMinor);
  }

  const { totalDebits, engineRan, nearBucketEdgeCount, overBucketCapCount, bucketSampleSize } = counters;
  return {
    totalDebits,
    engineRan,
    nearBucketEdgeCount,
    overBucketCapCount,
    bucketSampleSize,
    wouldHaveSoftIntervenedCount: counters.wouldHaveSoftIntervenedCount,
    avgRewardRateActual: avg(rewardScores),
    avgRewardRateBest: avg(rewardScores),
    betterRewardCount: counters.betterRewardCount,
    rewardSampleSize: counters.rewardSampleSize,
    smallDebitCount: counters.smallDebitCount,
    mediumDebitCount: counters.mediumDebitCount,
    largeDebitCount: counters.largeDebitCount,
    veryLargeDebitCount: counters.veryLargeDebitCount,
    highPainSampleSize: counters.highPainSampleSize,
    highPainCandidateCount: counters.highPainCandidateCount,
    highPainWarningCount: counters.highPainWarningCount,
    cardPickCount: counters.cardPickCount,
    skipCount: counters.skipCount,
  };
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
