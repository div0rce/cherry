import type { AlertReason } from './alertPolicy.js';
import { logInfo } from '../logger.js';

type SendEmailParams = {
  to: string;
  status: string;
  safeToSpendCents: number | null;
  reason: AlertReason;
};

// ponytail: placeholder, no email transport yet, so nothing is sent. Compose the subject and
// body from params when a transport is added (git history has the earlier draft copy). Never log
// the recipient address or the user's balance.
export async function sendEmailAlert(params: SendEmailParams): Promise<void> {
  logInfo('daily_state_email_placeholder', { status: params.status, reason: params.reason });
}
