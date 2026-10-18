import {
  CherryPointLedgerStatus,
  LedgerAnomalyCode,
  RecommendationStatus,
  SessionAnomalyCode,
  VerificationStatus,
} from '@prisma/client';
import { prisma } from '../prisma.js';
import { ensureBucketFresh } from '../buckets/ensure-fresh.js';
import { computeBucketReversal } from '../sessions/reversal.js';
import { logError, logWarn } from '../logger.js';
import { asAppError } from '../errors.js';
import type { VerificationResult, VerificationSignal } from './types.js';

const AMOUNT_TOLERANCE_RATIO = 0.05;
const AMOUNT_TOLERANCE_MIN_CENTS = 100;
const TIME_TOLERANCE_MS = 24 * 60 * 60 * 1000;

function hasNonEmptyString(value?: string | null): value is string {
  return value !== undefined && value !== null && value !== '';
}

function amountsMatch(signalAmount: number, targetAmount: number): boolean {
  const delta = Math.abs(signalAmount - targetAmount);
  const tolerance = Math.max(AMOUNT_TOLERANCE_MIN_CENTS, Math.floor(targetAmount * AMOUNT_TOLERANCE_RATIO));
  return delta <= tolerance;
}

function merchantsMatch(signalMerchant?: string | null, targetMerchant?: string | null): boolean {
  if (!hasNonEmptyString(signalMerchant) || !hasNonEmptyString(targetMerchant)) return true;
  return signalMerchant.trim().toLowerCase() === targetMerchant.trim().toLowerCase();
}

function isFinalStatus(status: RecommendationStatus): boolean {
  if (status === RecommendationStatus.VERIFIED) return true;
  if (status === RecommendationStatus.REJECTED) return true;
  return false;
}

type SessionRow = NonNullable<Awaited<ReturnType<typeof prisma.recommendationSession.findFirst>>>;
type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
type FreshBucket = Awaited<ReturnType<typeof ensureBucketFresh>>;
type BucketReversal ={ bucketId: string; newSpentCents: number } | null;

type VerificationOutcome = {
  occurredAt: Date;
  verified: boolean;
  sessionStatus: typeof RecommendationStatus.VERIFIED | typeof RecommendationStatus.REJECTED;
  ledgerStatus: typeof CherryPointLedgerStatus.POSTED | typeof CherryPointLedgerStatus.REVOKED;
  anomalyCode: SessionAnomalyCode;
};

type VerificationContext = { session: SessionRow; userId: string; outcome: VerificationOutcome };

const BUCKET_USER_MISMATCH = 'BUCKET_USER_MISMATCH' as const;

function resolveSignalIds(signal: VerificationSignal): { sessionId: string; userId: string } | null {
  const sessionId = hasNonEmptyString(signal.sessionId) ? signal.sessionId : null;
  const userId = hasNonEmptyString(signal.userId) ? signal.userId : null;
  if (sessionId === null || userId === null) return null;
  return { sessionId, userId };
}

function signalMatchesSession(signal: VerificationSignal, session: SessionRow, occurredAt: Date): boolean {
  const targetAmount =
    session.confirmedAmountCents == null ? session.amountCents : session.confirmedAmountCents;
  const signalAmount = signal.amountCents == null ? targetAmount : signal.amountCents;
  const amountMatches = amountsMatch(signalAmount, targetAmount);
  const timeMatches = Math.abs(occurredAt.getTime() - session.createdAt.getTime()) <= TIME_TOLERANCE_MS;
  const merchantMatches = merchantsMatch(signal.merchantFingerprint, session.merchantName);
  return amountMatches && timeMatches && merchantMatches;
}

function resolveAnomalyCode(verified: boolean, session: SessionRow): SessionAnomalyCode {
  if (verified || session.anomalyCode !== SessionAnomalyCode.NONE) return session.anomalyCode;
  return SessionAnomalyCode.VERIFICATION_CONFLICT;
}

function decideOutcome(signal: VerificationSignal, session: SessionRow): VerificationOutcome {
  const occurredAt = signal.occurredAt == null ? session.createdAt : signal.occurredAt;
  const inferredVerified = signalMatchesSession(signal, session, occurredAt);
  const verified = signal.verified == null ? inferredVerified : signal.verified;
  return {
    occurredAt,
    verified,
    sessionStatus: verified ? RecommendationStatus.VERIFIED : RecommendationStatus.REJECTED,
    ledgerStatus: verified ? CherryPointLedgerStatus.POSTED : CherryPointLedgerStatus.REVOKED,
    anomalyCode: resolveAnomalyCode(verified, session),
  };
}

async function planBucketReversal({
  session,
  userId,
  outcome,
}: VerificationContext): Promise<BucketReversal | typeof BUCKET_USER_MISMATCH> {
  if (outcome.verified || !hasNonEmptyString(session.recommendedBucketId)) return null;
  const freshBucket = await ensureBucketFresh(session.recommendedBucketId, outcome.occurredAt);
  if (isForeignBucket(freshBucket, userId)) return BUCKET_USER_MISMATCH;
  return computeBucketReversal(reversalInput(session, outcome.verified, freshBucket));
}

function isForeignBucket(freshBucket: FreshBucket | undefined, userId: string): boolean {
  return freshBucket !== null && freshBucket !== undefined && freshBucket.userId !== userId;
}

function reversalInput(
  session: SessionRow,
  verified: boolean,
  freshBucket: FreshBucket | undefined
): Parameters<typeof computeBucketReversal>[0] {
  return {
    verified,
    confirmedAmountCents: session.confirmedAmountCents == null ? null : session.confirmedAmountCents,
    bucketSpendReversed: session.bucketSpendReversed == null ? false : session.bucketSpendReversed,
    bucketId: freshBucket ? freshBucket.id : null,
    currentBucketSpentCents: freshBucket ? freshBucket.spentCents : null,
  };
}

async function updateSessionRow(
  tx: TxClient,
  { session, userId, outcome }: VerificationContext,
  reversal: BucketReversal
): Promise<void> {
  const { verified, occurredAt } = outcome;
  const updatedSession = await tx.recommendationSession.updateMany({
    where: { id: session.id, userId },
    data: {
      status: outcome.sessionStatus,
      verificationStatus: verified ? VerificationStatus.VERIFIED : VerificationStatus.FAILED,
      anomalyCode: outcome.anomalyCode,
      verifiedAt: verified ? occurredAt : null,
      rejectedAt: verified ? null : occurredAt,
      ...(reversal ? { bucketSpendReversed: true } : {}),
    },
  });

  if (updatedSession.count === 0) {
    throw new Error('Session update failed due to scoping');
  }
}

async function settlePendingLedger(tx: TxClient, { session, userId, outcome }: VerificationContext): Promise<void> {
  const { ledgerStatus, occurredAt, anomalyCode } = outcome;
  const anomalous = anomalyCode !== SessionAnomalyCode.NONE;
  await tx.cherryPointLedger.updateMany({
    where: { sessionId: session.id, userId, status: CherryPointLedgerStatus.PENDING },
    data: {
      status: ledgerStatus,
      postedAt: ledgerStatus === CherryPointLedgerStatus.POSTED ? occurredAt : null,
      revokedAt: ledgerStatus === CherryPointLedgerStatus.REVOKED ? occurredAt : null,
      isAnomalous: anomalous,
      anomalyCode: anomalous ? LedgerAnomalyCode.SESSION_ANOMALOUS : LedgerAnomalyCode.NONE,
    },
  });
}

async function applyBucketReversal(tx: TxClient, userId: string, reversal: BucketReversal): Promise<void> {
  if (reversal === null) return;
  const bucketUpdate = await tx.bucket.updateMany({
    where: { id: reversal.bucketId, userId },
    data: { spentCents: reversal.newSpentCents },
  });
  if (bucketUpdate.count === 0) {
    throw new Error('Bucket update failed due to user scoping');
  }
}

async function persistVerification(ctx: VerificationContext, reversal: BucketReversal): Promise<boolean> {
  try {
    await prisma.$transaction(async (tx) => {
      await updateSessionRow(tx, ctx, reversal);
      await settlePendingLedger(tx, ctx);
      await applyBucketReversal(tx, ctx.userId, reversal);
    });
    return true;
  } catch (caught: unknown) {
    const appError = asAppError(caught);
    logError('verify_session_failed', { err: appError, sessionId: ctx.session.id, userId: ctx.userId });
    return false;
  }
}

export async function verifySessionFromSignal(signal: VerificationSignal): Promise<VerificationResult> {
  const ids = resolveSignalIds(signal);
  if (ids === null) {
    return { ok: false, reason: 'INVALID', message: 'sessionId and userId are required' };
  }
  const { sessionId, userId } = ids;

  const session = await prisma.recommendationSession.findFirst({
    where: { id: sessionId, userId },
  });

  if (session === null) {
    return { ok: false, reason: 'NOT_FOUND' };
  }

  if (isFinalStatus(session.status)) {
    return {
      ok: false,
      reason: 'FINALIZED',
      sessionStatus: session.status,
      message: 'Session already finalized',
    };
  }

  const ctx: VerificationContext = { session, userId, outcome: decideOutcome(signal, session) };
  const reversal = await planBucketReversal(ctx);
  if (reversal === BUCKET_USER_MISMATCH) {
    return { ok: false, reason: 'INVALID', message: 'Bucket/user mismatch' };
  }

  if (!(await persistVerification(ctx, reversal))) {
    return { ok: false, reason: 'INVALID', message: 'Failed to verify session' };
  }

  const { sessionStatus, ledgerStatus, verified } = ctx.outcome;
  return { ok: true, sessionStatus, ledgerStatus, reason: verified ? 'MATCHED' : 'FORCED' };
}

/**
 * Placeholder for async verification flow; remains a no-op until wired to signals.
 */
export async function autoVerifySession(_sessionId: string): Promise<null> {
  logWarn('autoVerifySession is not wired to external signals yet');
  return null;
}
