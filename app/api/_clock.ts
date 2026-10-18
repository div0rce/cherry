import type { BucketPeriod } from '@prisma/client';
import { parseInstant } from '../../lib/util/instant.js';

type ResolveNowOptions = { allowImplicit?: boolean };

export function resolveNow(raw: unknown, options?: ResolveNowOptions): Date {
  const parsed = parseInstant(raw);
  if (parsed !== null) return parsed;
  if (options?.allowImplicit !== true) {
    throw new Error('Implicit time is forbidden. Thread `now` explicitly from boundary.');
  }
  if ((process.env.NODE_ENV ?? 'development') === 'production') {
    throw new Error('Implicit time is forbidden in production. Thread `now` explicitly from boundary.');
  }
  return new Date();
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
