// Advisory-only DailyState kernel runner. Writes the user's DailyState row, rolls their buckets
// into the current period (ensureBucketFresh) and may record an AlertEvent. It never touches
// sessions or the ledger. Do not add auth, spend, or UI coupling here.
import { createHash } from 'crypto';
import { DailyStateStatus, Prisma } from '@prisma/client';
import type { DailyState, DailyStateSource } from '@prisma/client';
import { prisma } from '../prisma.js';
import { ensureBucketFresh } from '../buckets/ensure-fresh.js';
import { toBucketRuntime } from '../buckets-runtime.js';
import { processDailyStateAlert } from '../alerts/processDailyStateAlert.js';
import { logError } from '../logger.js';
import { AppError, asAppError } from '../errors.js';
import { getServerConfig } from '../config/store.js';

// A future date would roll every bucket into a future period and persist spentCents = 0,
// wiping the current period's spend. Callers pass the boundary clock as nowMs.
export function isFutureUtcDay(date: Date, nowMs: number): boolean {
  return startOfUtcDay(date).getTime() > startOfUtcDay(new Date(nowMs)).getTime();
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function rank(status: DailyStateStatus): number {
  if (status === DailyStateStatus.SAFE) return 3;
  if (status === DailyStateStatus.TIGHT) return 2;
  if (status === DailyStateStatus.RISKY) return 1;
  return 0;
}

type RuntimeBucket = ReturnType<typeof toBucketRuntime>;
type CardWithRules = Awaited<ReturnType<typeof loadCards>>[number];
type DailyRunResult = {
  status: DailyStateStatus;
  inputsVersion: string | null;
  engineVersion: string | null;
};

type DailySnapshot = {
  status: DailyStateStatus;
  minRemaining: number;
  nextRiskEvent: { kind: string; at: Date | null } | typeof Prisma.JsonNull;
  summary: {
    buckets: { remainingCents: number; exhaustedCategories: string[] };
    pointsPending: number;
    sessionsPendingVerification: number;
  };
  inputsVersion: string;
};

type DailyWriteTarget = {
  userId: string;
  targetDate: Date;
  now: Date;
  source: DailyStateSource;
  resolvedEngineVersion: string | null;
};

async function loadFreshRuntimeBuckets(userId: string, now: Date): Promise<RuntimeBucket[]> {
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

  return freshBuckets.map(toBucketRuntime);
}

function loadCards(userId: string) {
  return prisma.card.findMany({
    where: { userId },
    include: { rewardRules: true },
  });
}

function classifyStatus(runtimeBuckets: RuntimeBucket[], cards: CardWithRules[], minRemaining: number): DailyStateStatus {
  if (runtimeBuckets.length === 0 || cards.length === 0) return DailyStateStatus.INSUFFICIENT_DATA;
  if (minRemaining <= 0) return DailyStateStatus.RISKY;
  if (minRemaining <= 2000) return DailyStateStatus.TIGHT;
  return DailyStateStatus.SAFE;
}

function computeMinRemaining(runtimeBuckets: RuntimeBucket[]): number {
  return runtimeBuckets.reduce<number>(
    (acc, b) => Math.min(acc, b.remainingCents ?? acc),
    runtimeBuckets.length > 0 ? Number.POSITIVE_INFINITY : 0
  );
}

function computeNextRiskEvent(runtimeBuckets: RuntimeBucket[]): DailySnapshot['nextRiskEvent'] {
  if (runtimeBuckets.length === 0) return Prisma.JsonNull;
  return {
    kind: 'BUCKET_PERIOD_END',
    at: runtimeBuckets
      .map((b) => b.periodEnd)
      .filter(Boolean)
      .sort((a, b) => a.getTime() - b.getTime())[0] ?? null,
  };
}

function hashInputs(
  runtimeBuckets: RuntimeBucket[],
  cards: CardWithRules[],
  summary: DailySnapshot['summary']
): string {
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
      sessionsPendingVerification: summary.sessionsPendingVerification,
    })
  );
  return hash.digest('hex');
}

async function buildDailySnapshot(userId: string, now: Date): Promise<DailySnapshot> {
  const runtimeBuckets = await loadFreshRuntimeBuckets(userId, now);
  const cards = await loadCards(userId);

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

  const minRemaining = computeMinRemaining(runtimeBuckets);

  const remainingTotal = runtimeBuckets.reduce<number>(
    (acc, b) => acc + (b.remainingCents ?? 0),
    0
  );

  const status = classifyStatus(runtimeBuckets, cards, minRemaining);
  const nextRiskEvent = computeNextRiskEvent(runtimeBuckets);

  const summary = {
    buckets: {
      remainingCents: remainingTotal,
      exhaustedCategories,
    },
    pointsPending: ledgerPending._sum.points ?? 0,
    sessionsPendingVerification,
  };

  return { status, minRemaining, nextRiskEvent, summary, inputsVersion: hashInputs(runtimeBuckets, cards, summary) };
}

function isDowngradeOfSameInputs(existing: DailyState | null, snapshot: DailySnapshot): existing is DailyState {
  return (
    existing !== null &&
    existing.inputsVersion === snapshot.inputsVersion &&
    rank(snapshot.status) < rank(existing.status)
  );
}

function upsertDailyState(target: DailyWriteTarget, snapshot: DailySnapshot): Promise<DailyState> {
  const { userId, targetDate, now, source, resolvedEngineVersion } = target;
  const { status, minRemaining, nextRiskEvent, summary, inputsVersion } = snapshot;
  const fields = {
    status,
    safeToSpendCents: Number.isFinite(minRemaining) ? Math.max(0, Math.floor(minRemaining)) : null,
    nextRiskEvent,
    summary,
    computedAt: now,
    source,
    engineVersion: resolvedEngineVersion,
    inputsVersion,
    errors: null,
  };
  return prisma.dailyState.upsert({
    where: { userId_date: { userId, date: targetDate } },
    update: fields,
    create: { userId, date: targetDate, ...fields },
  });
}

async function recordDailyFailure(target: DailyWriteTarget, error: unknown): Promise<DailyRunResult> {
  const { userId, targetDate, now, source, resolvedEngineVersion } = target;
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

async function notifyDailyStateAlert(userId: string, prev: DailyState | null, curr: DailyState): Promise<void> {
  try {
    await processDailyStateAlert({ prev, curr });
  } catch (caught: unknown) {
    const appError = asAppError(caught);
    logError('daily_state_alert_unhandled', { userId, err: appError });
  }
}

export async function runDailyForUser(params: {
  userId: string;
  date: Date;
  source: DailyStateSource;
  nowMs: number;
  engineVersion?: string | null;
}): Promise<DailyRunResult> {
  const { userId, date, source, nowMs, engineVersion: engineVersionOverride } = params;
  if (isFutureUtcDay(date, nowMs)) {
    throw new AppError('VALIDATION', 'DailyState date must not be in the future', 400);
  }
  const { engineVersion } = getServerConfig();
  const resolvedEngineVersion = engineVersionOverride ?? engineVersion;
  const targetDate = startOfUtcDay(date);
  const now = targetDate;
  const target: DailyWriteTarget = { userId, targetDate, now, source, resolvedEngineVersion };

  const existing = await prisma.dailyState.findUnique({
    where: { userId_date: { userId, date: targetDate } },
  });

  const prevForAlert = await prisma.dailyState.findFirst({
    where: { userId, date: { lt: targetDate } },
    orderBy: { date: 'desc' },
  });

  let dailyState: DailyState;
  try {
    const snapshot = await buildDailySnapshot(userId, now);
    if (isDowngradeOfSameInputs(existing, snapshot)) {
      return {
        status: existing.status,
        inputsVersion: existing.inputsVersion,
        engineVersion: existing.engineVersion,
      };
    }
    dailyState = await upsertDailyState(target, snapshot);
  } catch (error: unknown) {
    return recordDailyFailure(target, error);
  }

  await notifyDailyStateAlert(userId, prevForAlert, dailyState);

  return {
    status: dailyState.status,
    inputsVersion: dailyState.inputsVersion,
    engineVersion: dailyState.engineVersion,
  };
}
