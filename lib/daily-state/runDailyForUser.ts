// Advisory-only DailyState kernel runner.
// Do not add auth, spend, alerts, UI coupling, or mutations beyond the DailyState row.
import { createHash } from 'crypto';
import { DailyStateSource, DailyStateStatus, Prisma, type DailyState } from '@prisma/client';
import { prisma } from '../prisma';
import { ensureBucketFresh } from '../buckets/ensure-fresh';
import { toBucketRuntime } from '../buckets-runtime';
import { processDailyStateAlert } from '../alerts/processDailyStateAlert';
import { logError } from '../logger';
import { asAppError } from '../errors';
import { getServerConfig } from '../config/store';

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function rank(status: DailyStateStatus): number {
  if (status === DailyStateStatus.SAFE) return 3;
  if (status === DailyStateStatus.TIGHT) return 2;
  if (status === DailyStateStatus.RISKY) return 1;
  return 0;
}

export async function runDailyForUser(params: {
  userId: string;
  date: Date;
  source: DailyStateSource;
  engineVersion?: string | null;
}): Promise<{
  status: DailyStateStatus;
  inputsVersion: string | null;
  engineVersion: string | null;
}> {
  const { userId, date, source, engineVersion: engineVersionOverride } = params;
  const { engineVersion } = getServerConfig();
  const resolvedEngineVersion = engineVersionOverride ?? engineVersion;
  const targetDate = startOfUtcDay(date);
  const now = targetDate;

  const existing = await prisma.dailyState.findUnique({
    where: { userId_date: { userId, date: targetDate } },
  });

  const prevForAlert = await prisma.dailyState.findFirst({
    where: { userId, date: { lt: targetDate } },
    orderBy: { date: 'desc' },
  });

  let dailyStateRecord: DailyState | null = null;
  let resultStatus: DailyStateStatus | null = null;
  let resultInputsVersion: string | null = null;
  let resultEngineVersion: string | null = null;

  try {
    const buckets = await prisma.bucket.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    const freshBuckets = (
      await Promise.all(
        buckets.map(async (bucket) => {
          const fresh = await ensureBucketFresh(bucket.id, now);
          return fresh && fresh.userId === userId ? fresh : null;
        })
      )
    ).filter((b): b is NonNullable<typeof b> => b !== null);

    const runtimeBuckets = freshBuckets.map(toBucketRuntime);
    const cards = await prisma.card.findMany({
      where: { userId },
      include: { rewardRules: true },
    });

    const ledgerPending = await prisma.cherryPointLedger.aggregate({
      where: { userId, status: 'PENDING' },
      _sum: { points: true },
    });

    const sessionsPendingVerification = await prisma.recommendationSession.count({
      where: {
        userId,
        verificationStatus: 'PENDING',
      },
    });

    const exhaustedCategories = runtimeBuckets
      .filter((b) => (b.remainingCents ?? 0) <= 0)
      .map((b) => b.category);

    const minRemaining = runtimeBuckets.reduce<number>(
      (acc, b) => Math.min(acc, b.remainingCents ?? acc),
      runtimeBuckets.length > 0 ? Number.POSITIVE_INFINITY : 0
    );

    const remainingTotal = runtimeBuckets.reduce<number>(
      (acc, b) => acc + (b.remainingCents ?? 0),
      0
    );

    let status: DailyStateStatus = DailyStateStatus.INSUFFICIENT_DATA;
    if (runtimeBuckets.length === 0 || cards.length === 0) {
      status = DailyStateStatus.INSUFFICIENT_DATA;
    } else if (minRemaining <= 0) {
      status = DailyStateStatus.RISKY;
    } else if (minRemaining <= 2000) {
      status = DailyStateStatus.TIGHT;
    } else {
      status = DailyStateStatus.SAFE;
    }

    const nextRiskEvent =
      runtimeBuckets.length > 0
        ? {
            kind: 'BUCKET_PERIOD_END',
            at: runtimeBuckets
              .map((b) => b.periodEnd)
              .filter(Boolean)
              .sort((a, b) => a.getTime() - b.getTime())[0] ?? null,
          }
        : Prisma.JsonNull;

    const summary = {
      buckets: {
        remainingCents: remainingTotal,
        exhaustedCategories,
      },
      pointsPending: ledgerPending._sum.points ?? 0,
      sessionsPendingVerification,
    };

    const hash = createHash('sha256');
    hash.update(
      JSON.stringify({
        buckets: runtimeBuckets.map((b) => ({
          id: b.id,
          remainingCents: b.remainingCents,
          periodEnd: b.periodEnd?.toISOString() ?? null,
        })),
        cards: cards.map((c) => ({ id: c.id, rewardRules: c.rewardRules.length })),
        pointsPending: summary.pointsPending,
        sessionsPendingVerification,
      })
    );
    const inputsVersion = hash.digest('hex');

    if (
      existing !== null &&
      existing.inputsVersion === inputsVersion &&
      rank(status) < rank(existing.status)
    ) {
      return {
        status: existing.status,
        inputsVersion: existing.inputsVersion,
        engineVersion: existing.engineVersion,
      };
    }

    const dailyState = await prisma.dailyState.upsert({
      where: { userId_date: { userId, date: targetDate } },
      update: {
        status,
        safeToSpendCents: Number.isFinite(minRemaining) ? Math.max(0, Math.floor(minRemaining)) : null,
        nextRiskEvent,
        summary,
        computedAt: now,
        source,
        engineVersion: resolvedEngineVersion,
        inputsVersion,
        errors: null,
      },
      create: {
        userId,
        date: targetDate,
        status,
        safeToSpendCents: Number.isFinite(minRemaining) ? Math.max(0, Math.floor(minRemaining)) : null,
        nextRiskEvent,
        summary,
        computedAt: now,
        source,
        engineVersion: resolvedEngineVersion,
        inputsVersion,
        errors: null,
      },
    });

    dailyStateRecord = dailyState;
    resultStatus = dailyState.status;
    resultInputsVersion = dailyState.inputsVersion;
    resultEngineVersion = dailyState.engineVersion;
  } catch (error: unknown) {
    const appError = asAppError(error);
    const fallbackStatus: DailyStateStatus = DailyStateStatus.INSUFFICIENT_DATA;
    await prisma.dailyState.upsert({
      where: { userId_date: { userId, date: targetDate } },
      update: {
        status: fallbackStatus,
        computedAt: now,
        source,
        errors: appError.message,
      },
      create: {
        userId,
        date: targetDate,
        status: fallbackStatus,
        computedAt: now,
        source,
        engineVersion: resolvedEngineVersion,
        inputsVersion: null,
        summary: Prisma.JsonNull,
        safeToSpendCents: null,
        nextRiskEvent: Prisma.JsonNull,
        errors: appError.message,
      },
    });

    return { status: fallbackStatus, inputsVersion: null, engineVersion: resolvedEngineVersion };
  }

  if (dailyStateRecord !== null) {
    try {
      await processDailyStateAlert({ prev: prevForAlert, curr: dailyStateRecord });
    } catch (caught: unknown) {
      const appError = asAppError(caught);
      logError('daily_state_alert_unhandled', { userId, err: appError });
    }
  }

  return {
    status: resultStatus ?? DailyStateStatus.INSUFFICIENT_DATA,
    inputsVersion: resultInputsVersion,
    engineVersion: resultEngineVersion,
  };
}
