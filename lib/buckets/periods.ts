import type { Bucket, BucketPeriod } from '@prisma/client';

export type BucketWithDerived = Bucket & { isExpired?: boolean };

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function advanceWindow(period: BucketPeriod, start: Date, end: Date): { start: Date; end: Date } {
  if (period === 'WEEKLY') {
    return {
      start: addDays(start, 7),
      end: addDays(end, 7),
    };
  }

  // MONTHLY
  return {
    start: addMonths(start, 1),
    end: addMonths(end, 1),
  };
}

export function computeNextPeriodWindow(
  period: BucketPeriod,
  periodStart: Date,
  periodEnd: Date,
  now: Date
): {
  needsRollover: boolean;
  newPeriodStart: Date;
  newPeriodEnd: Date;
} {
  if (now <= periodEnd) {
    return { needsRollover: false, newPeriodStart: periodStart, newPeriodEnd: periodEnd };
  }

  let nextStart = new Date(periodStart);
  let nextEnd = new Date(periodEnd);

  // Advance by full periods until the window covers "now"
  while (now > nextEnd) {
    const advanced = advanceWindow(period, nextStart, nextEnd);
    nextStart = advanced.start;
    nextEnd = advanced.end;
  }

  return { needsRollover: true, newPeriodStart: nextStart, newPeriodEnd: nextEnd };
}

export function applyInMemoryRollover(bucket: Bucket, now: Date): BucketWithDerived {
  // If period fields are missing, treat as non-rolling legacy bucket
  if (!bucket.periodStart || !bucket.periodEnd) {
    return { ...bucket, isExpired: false };
  }

  const { needsRollover, newPeriodStart, newPeriodEnd } = computeNextPeriodWindow(
    bucket.period,
    bucket.periodStart,
    bucket.periodEnd,
    now
  );

  if (!needsRollover) {
    return { ...bucket, isExpired: false };
  }

  return {
    ...bucket,
    periodStart: newPeriodStart,
    periodEnd: newPeriodEnd,
    spentCents: 0,
    lastResetAt: now,
    isExpired: true,
  };
}
