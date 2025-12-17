import type { DailyState } from '@prisma/client';

export type AlertReason = 'SAFE_TO_TIGHT' | 'TIGHT_TO_RISKY';

function startOfUtcDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function evaluateDailyStateTransition(params: {
  prev: DailyState | null;
  curr: DailyState;
}): { shouldAlert: boolean; reason?: AlertReason } {
  const { prev, curr } = params;

  if (curr.status === 'INSUFFICIENT_DATA') {
    return { shouldAlert: false };
  }

  if (prev === null) {
    return { shouldAlert: false };
  }

  const sameDay = startOfUtcDay(prev.date) === startOfUtcDay(curr.date);
  if (sameDay) {
    return { shouldAlert: false };
  }

  if (prev.status === 'SAFE' && curr.status === 'TIGHT') {
    return { shouldAlert: true, reason: 'SAFE_TO_TIGHT' };
  }

  if (prev.status === 'TIGHT' && curr.status === 'RISKY') {
    return { shouldAlert: true, reason: 'TIGHT_TO_RISKY' };
  }

  return { shouldAlert: false };
}
