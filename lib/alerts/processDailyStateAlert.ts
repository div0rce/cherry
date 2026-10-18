// Advisory-only alert processing. Do not add auth/spend/alerts/UI coupling beyond this minimal channel.
import { prisma } from '../prisma.js';
import type { DailyState } from '@prisma/client';
import { evaluateDailyStateTransition, type AlertReason } from './alertPolicy.js';
import { sendEmailAlert } from './sendEmailAlert.js';
import { logError, logInfo } from '../logger.js';
import { asAppError } from '../errors.js';

function hasEmail(user: { email: string | null } | null): user is { email: string } {
  return typeof user?.email === 'string' && user.email !== '';
}

async function sendAndRecordAlert(curr: DailyState, email: string, reason: AlertReason): Promise<void> {
  try {
    await sendEmailAlert({
      to: email,
      status: curr.status,
      safeToSpendCents: curr.safeToSpendCents ?? null,
      reason,
    });
    await prisma.alertEvent.create({
      data: {
        userId: curr.userId,
        date: curr.date,
        kind: reason,
      },
    });
    logInfo('daily_state_alert_sent', {
      userId: curr.userId,
      kind: reason,
      date: curr.date.toISOString(),
    });
  } catch (error: unknown) {
    const appError = asAppError(error);
    logError('daily_state_alert_failed', { userId: curr.userId, err: appError });
  }
}

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
  if (!hasEmail(user)) {
    logInfo('daily_state_alert_skipped', { userId: curr.userId, reason: 'missing_email' });
    return;
  }

  await sendAndRecordAlert(curr, user.email, policy.reason);
}
