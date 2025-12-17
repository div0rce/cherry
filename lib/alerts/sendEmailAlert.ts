import type { AlertReason } from '@/lib/alerts/alertPolicy';
import { logInfo } from '@/lib/logger';

type SendEmailParams = {
  to: string;
  status: string;
  safeToSpendCents: number | null;
  reason: AlertReason;
};

export async function sendEmailAlert(params: SendEmailParams): Promise<void> {
  const { to, status, safeToSpendCents, reason } = params;

  const subject = `Cherry status update: ${status}`;
  const safeDollars =
    safeToSpendCents === null || Number.isNaN(safeToSpendCents)
      ? 'Unknown'
      : `$${(safeToSpendCents / 100).toFixed(0)}`;

  const reasonText =
    reason === 'SAFE_TO_TIGHT'
      ? 'One or more essential buckets are nearing exhaustion.'
      : 'Essential budgets are exhausted; risk is elevated.';

  const body = `Status: ${status}
Safe to spend today: ${safeDollars}
Reason: ${reasonText}`;

  // Placeholder: real email transport would plug in here.
  logInfo('daily_state_email_sent', { to, subject, body });
}
