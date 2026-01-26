import type { BucketPeriod } from '@prisma/client';

type ResolveNowOptions = { allowImplicit?: boolean };

export function resolveNow(raw: unknown, options?: ResolveNowOptions): Date {
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return raw;
  }

  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed !== '') {
      const parsed = new Date(trimmed);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
  }

  if (options?.allowImplicit === true) {
    if ((process.env.NODE_ENV ?? 'development') === 'production') {
      throw new Error('Implicit time is forbidden in production. Thread `now` explicitly from boundary.');
    }
    return new Date();
  }

  throw new Error('Implicit time is forbidden. Thread `now` explicitly from boundary.');
}

export function getPeriodWindow(period: BucketPeriod, now: Date): { start: Date; end: Date } {
  const start = new Date(now);
  const end = new Date(now);

  if (period === 'WEEKLY') {
    const day = start.getDay();
    const diffToMonday = (day + 6) % 7;
    start.setDate(start.getDate() - diffToMonday);
    start.setHours(0, 0, 0, 0);
    end.setTime(start.getTime());
    end.setDate(start.getDate() + 7);
  } else {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    end.setTime(start.getTime());
    end.setMonth(start.getMonth() + 1);
  }

  end.setHours(0, 0, 0, 0);
  return { start, end };
}
