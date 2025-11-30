/**
 * Verification orchestrator (stub).
 *
 * Current status: intentionally a no-op. Cherry is advisory-only today and does
 * not pull external signals (bank data, receipts, Vine reconciliation) to
 * auto-verify transactions.
 *
 * Future behavior (see docs/cherry-core-loop-engine-vine-wallet-audit.md §4):
 * - Call out to bank/receipt/Vine reconciliation services.
 * - Produce a verification decision (verified / rejected / needs manual review).
 * - Call /api/sessions/[id]/verify with that decision, updating session + ledger.
 *
 * Do not add external integrations here without updating legal constraints and
 * product docs first.
 */
export async function autoVerifySession(_sessionId: string): Promise<null> {
  return null;
}
