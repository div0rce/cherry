// Advisory-only alert processing. Do not add auth/spend/alerts/UI coupling beyond this minimal channel.
import { prisma } from '@/lib/prisma';
import type { DailyState } from '@prisma/client';
import { evaluateDailyStateTransition } from './alertPolicy';
import { sendEmailAlert } from './sendEmailAlert';
import { logError, logInfo } from '@/lib/logger';
import { asError } from '@/lib/errors';

export async function processDailyStateAlert(params: {
  prev: DailyState | null;
  curr: DailyState;
}): Promise<void> {
  const { prev, curr } = params;
  const policy = evaluateDailyStateTransition({ prev, curr });
  if (!policy.shouldAlert || policy.reason === undefined) {
    logInfo('daily_state_alert_skipped', { userId: curr.userId, reason: 'policy_skip' });
    return;
  }

  const alreadySent = await prisma.alertEvent.findUnique({
    where: {
      userId_date_kind: {
        userId: curr.userId,
        date: curr.date,
        kind: policy.reason,
      },
    },
  });
  if (alreadySent !== null) {
    logInfo('daily_state_alert_skipped', { userId: curr.userId, reason: 'already_sent' });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: curr.userId },
    select: { email: true },
  });
  if (user === null || user.email === null || user.email === undefined || user.email === '') {
    logInfo('daily_state_alert_skipped', { userId: curr.userId, reason: 'missing_email' });
    return;
  }

  try {
    await sendEmailAlert({
      to: user.email,
      status: curr.status,
      safeToSpendCents: curr.safeToSpendCents ?? null,
      reason: policy.reason,
    });
    await prisma.alertEvent.create({
      data: {
        userId: curr.userId,
        date: curr.date,
        kind: policy.reason,
      },
    });
    logInfo('daily_state_alert_sent', {
      userId: curr.userId,
      kind: policy.reason,
      date: curr.date.toISOString(),
    });
  } catch (error) {
    asError(error);
    logError('daily_state_alert_failed', { userId: curr.userId, err: error });
  }
}
