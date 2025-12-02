export type VerificationSource = 'BANK' | 'VINE' | 'MANUAL';

export type VerificationSignal = {
  sessionId: string;
  userId: string;
  amountCents?: number | null;
  occurredAt?: Date | null;
  merchantFingerprint?: string | null;
  source: VerificationSource;
  verified?: boolean;
};

export type VerificationResult =
  | {
      ok: true;
      sessionStatus: 'VERIFIED' | 'REJECTED';
      ledgerStatus: 'POSTED' | 'REVOKED';
      reason: 'MATCHED' | 'FORCED';
    }
  | {
      ok: false;
      reason:
        | 'NOT_FOUND'
        | 'FINALIZED'
        | 'EXPIRED'
        | 'MISMATCH'
        | 'NO_LEDGER'
        | 'INVALID';
      message?: string;
      sessionStatus?: string;
    };
