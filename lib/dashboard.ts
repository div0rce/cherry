import { prisma } from '@/lib/prisma';
import type { UnifiedActivityRow } from '@/lib/unified-activity';
import { getUnifiedActivityForUser } from '@/lib/unified-activity';
import { computeBucketBalanceFromNumbers } from './buckets-runtime';

export type DashboardStats = {
  cardCount: number;
  bucketCount: number;
  realTxCountMonth: number;
  simulatedTxCountMonth: number;
  lifetimePoints: number;
  monthPoints: number;
  bucketHealth: {
    onTrack: number;
    atRisk: number;
    overLimit: number;
  };
  recentUnifiedActivity: Array<{
    id: string;
    occurredAt: Date;
    kind: 'REAL_TRANSACTION' | 'SIMULATED_TRANSACTION' | 'POINTS_EVENT' | 'OTHER';
    label: string;
    amountCents?: number | null;
    currency?: string | null;
  }>;
  recentSimulations: Array<{
    id: string;
    occurredAt: Date;
    merchantLabel: string;
    amountCents: number;
    currency: string;
    verdict: string;
    recommendedCardName?: string | null;
  }>;
};

function getMonthRange(now: Date): { start: Date; end: Date } {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end };
}

function classifyBucketHealth(bucket: { budgetAmount: number; spentCents: number }): 'ON_TRACK' | 'AT_RISK' | 'OVER_LIMIT' {
  const balance = computeBucketBalanceFromNumbers(bucket.budgetAmount, bucket.spentCents, 0);
  const limit = balance.limitCents ?? 0;
  const remaining = balance.remainingCents ?? 0;

  if (limit <= 0) {
    return remaining > 0 ? 'AT_RISK' : 'OVER_LIMIT';
  }

  if (remaining <= 0) return 'OVER_LIMIT';
  const ratio = remaining / limit;
  if (ratio <= 0.1) return 'AT_RISK';
  return 'ON_TRACK';
}

function summarizeBucketHealth(
  buckets: Array<{ budgetAmount: number; spentCents: number }>
): DashboardStats['bucketHealth'] {
  return buckets.reduce<DashboardStats['bucketHealth']>(
    (acc, bucket) => {
      const verdict = classifyBucketHealth(bucket);
      if (verdict === 'ON_TRACK') acc.onTrack += 1;
      else if (verdict === 'AT_RISK') acc.atRisk += 1;
      else acc.overLimit += 1;
      return acc;
    },
    { onTrack: 0, atRisk: 0, overLimit: 0 }
  );
}

function normalizeActivityRow(item: UnifiedActivityRow): DashboardStats['recentUnifiedActivity'][number] {
  const hasMcc = item.mcc !== null && item.mcc !== undefined;
  const label =
    item.merchantName ??
    (hasMcc ? `MCC ${item.mcc}` : item.kind === 'POINTS_EVENT' ? 'Points event' : 'Activity');
  const amountCents =
    item.cashDeltaCents != null
      ? Math.abs(item.cashDeltaCents)
      : Number.isFinite(item.amount)
        ? Math.round(Number(item.amount) * 100)
        : null;

  return {
    id: item.id,
    occurredAt: item.occurredAt,
    kind: item.kind ?? 'OTHER',
    label,
    amountCents,
    currency: item.currency ?? null,
  };
}

function deriveSimulationVerdict(input: {
  status: string;
  strictDecline: boolean;
  bucketLimitCents: number | null;
  bucketAfterCents: number | null;
  amountCents: number;
}): string {
  if (input.status === 'DECLINED' || input.strictDecline) return 'DECLINED';

  const limit = input.bucketLimitCents;
  if (limit == null || limit <= 0) return 'UNCONFIGURED';

  const remaining = input.bucketAfterCents ?? limit - input.amountCents;
  if (remaining <= 0) return 'BREAKS_BUDGET';
  if (remaining / limit <= 0.1) return 'BORDERLINE';
  return 'HEALTHY';
}

export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  const now = new Date();
  const { start: monthStart, end: monthEnd } = getMonthRange(now);

  const [
    cardCount,
    buckets,
    bankTxMonth,
    simulatedTxMonth,
    sessionCountMonth,
    lifetimePointsAgg,
    monthPointsAgg,
    recentUnifiedActivityRaw,
    recentSimulationsRaw,
  ] = await Promise.all([
    prisma.card.count({ where: { userId } }),
    prisma.bucket.findMany({
      where: { userId },
      select: { budgetAmount: true, spentCents: true },
    }),
    prisma.bankTransaction.count({
      where: {
        userId,
        postedAt: { gte: monthStart, lt: monthEnd },
      },
    }),
    prisma.simulatedTransaction.count({
      where: {
        userId,
        createdAt: { gte: monthStart, lt: monthEnd },
      },
    }),
    prisma.recommendationSession.count({
      where: {
        userId,
        createdAt: { gte: monthStart, lt: monthEnd },
      },
    }),
    prisma.cherryPointLedger.aggregate({
      where: { userId, status: 'POSTED' },
      _sum: { points: true },
    }),
    prisma.cherryPointLedger.aggregate({
      where: {
        userId,
        status: 'POSTED',
        awardedAt: { gte: monthStart, lt: monthEnd },
      },
      _sum: { points: true },
    }),
    getUnifiedActivityForUser(userId, { limit: 5 }),
    prisma.simulatedTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        chosenCard: {
          select: { nickname: true, issuer: true, network: true },
        },
      },
    }),
  ]);

  const bucketHealth = summarizeBucketHealth(buckets);
  const lifetimePoints = lifetimePointsAgg._sum.points ?? 0;
  const monthPoints = monthPointsAgg._sum.points ?? 0;
  const recentUnifiedActivity = recentUnifiedActivityRaw.map(normalizeActivityRow);
  const simulatedTxCountMonth = simulatedTxMonth + sessionCountMonth;

  const recentSimulations = recentSimulationsRaw.map((sim) => ({
    id: sim.id,
    occurredAt: sim.createdAt,
    merchantLabel:
      sim.merchantName ??
      (sim.mccCode !== null && sim.mccCode !== undefined
        ? `MCC ${sim.mccCode}`
        : sim.resolvedCategory ?? 'Simulation'),
    amountCents: sim.amount,
    currency: sim.currency ?? 'USD',
    verdict: deriveSimulationVerdict({
      status: sim.status,
      strictDecline: sim.strictDecline,
      bucketLimitCents: sim.bucketLimitCents ?? null,
      bucketAfterCents: sim.bucketAfterCents ?? null,
      amountCents: sim.amount,
    }),
    recommendedCardName:
      sim.chosenCard?.nickname ??
      sim.chosenCard?.issuer ??
      sim.chosenCard?.network ??
      sim.chosenCardName ??
      null,
  }));

  return {
    cardCount,
    bucketCount: buckets.length,
    realTxCountMonth: bankTxMonth,
    simulatedTxCountMonth,
    lifetimePoints,
    monthPoints,
    bucketHealth,
    recentUnifiedActivity,
    recentSimulations,
  };
}
