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
import type { VerificationResult, VerificationSignal } from './types';

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

export async function verifySessionFromSignal(signal: VerificationSignal): Promise<VerificationResult> {
  const sessionId = hasNonEmptyString(signal.sessionId) ? signal.sessionId : null;
  const userId = hasNonEmptyString(signal.userId) ? signal.userId : null;
  if (sessionId === null || userId === null) {
    return { ok: false, reason: 'INVALID', message: 'sessionId and userId are required' };
  }

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

  const targetAmount =
    session.confirmedAmountCents == null ? session.amountCents : session.confirmedAmountCents;
  const signalAmount = signal.amountCents == null ? targetAmount : signal.amountCents;
  const occurredAt = signal.occurredAt == null ? session.createdAt : signal.occurredAt;
  const amountMatches = amountsMatch(signalAmount, targetAmount);
  const timeMatches = Math.abs(occurredAt.getTime() - session.createdAt.getTime()) <= TIME_TOLERANCE_MS;
  const merchantMatches = merchantsMatch(signal.merchantFingerprint, session.merchantName);

  const inferredVerified = amountMatches && timeMatches && merchantMatches;
  const verified = signal.verified == null ? inferredVerified : signal.verified;
  const sessionStatus = verified ? RecommendationStatus.VERIFIED : RecommendationStatus.REJECTED;
  const ledgerStatus = verified ? CherryPointLedgerStatus.POSTED : CherryPointLedgerStatus.REVOKED;
  const anomalyCode =
    verified || session.anomalyCode !== SessionAnomalyCode.NONE
      ? session.anomalyCode
      : SessionAnomalyCode.VERIFICATION_CONFLICT;

  let reversalBucketUpdate: { bucketId: string; newSpentCents: number } | null = null;
  const hasRecommendedBucketId = hasNonEmptyString(session.recommendedBucketId);
  if (!verified && hasRecommendedBucketId) {
    const recommendedBucketId = session.recommendedBucketId as string;
    const freshBucket = await ensureBucketFresh(recommendedBucketId, occurredAt);
    if (freshBucket !== null && freshBucket !== undefined && freshBucket.userId !== userId) {
      return { ok: false, reason: 'INVALID', message: 'Bucket/user mismatch' };
    }
    reversalBucketUpdate = computeBucketReversal({
      verified,
      confirmedAmountCents:
        session.confirmedAmountCents == null ? null : session.confirmedAmountCents,
      bucketSpendReversed:
        session.bucketSpendReversed == null ? false : session.bucketSpendReversed,
      bucketId: freshBucket ? freshBucket.id : null,
      currentBucketSpentCents: freshBucket ? freshBucket.spentCents : null,
    });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const updatedSession = await tx.recommendationSession.updateMany({
        where: { id: session.id, userId },
        data: {
          status: sessionStatus,
          verificationStatus: verified ? VerificationStatus.VERIFIED : VerificationStatus.FAILED,
          anomalyCode,
          verifiedAt: verified ? occurredAt : null,
          rejectedAt: verified ? null : occurredAt,
          ...(reversalBucketUpdate ? { bucketSpendReversed: true } : {}),
        },
      });

      if (updatedSession.count === 0) {
        throw new Error('Session update failed due to scoping');
      }

      await tx.cherryPointLedger.updateMany({
        where: { sessionId: session.id, userId, status: CherryPointLedgerStatus.PENDING },
        data: {
          status: ledgerStatus,
          postedAt: ledgerStatus === CherryPointLedgerStatus.POSTED ? occurredAt : null,
          revokedAt: ledgerStatus === CherryPointLedgerStatus.REVOKED ? occurredAt : null,
          isAnomalous: anomalyCode !== SessionAnomalyCode.NONE,
          anomalyCode:
            anomalyCode === SessionAnomalyCode.NONE
              ? LedgerAnomalyCode.NONE
              : LedgerAnomalyCode.SESSION_ANOMALOUS,
        },
      });

      if (reversalBucketUpdate !== null) {
        const bucketUpdate = await tx.bucket.updateMany({
          where: { id: reversalBucketUpdate.bucketId, userId },
          data: { spentCents: reversalBucketUpdate.newSpentCents },
        });
        if (bucketUpdate.count === 0) {
          throw new Error('Bucket update failed due to user scoping');
        }
      }
    });
  } catch (caught: unknown) {
    const appError = asAppError(caught);
    logError('verify_session_failed', { err: appError, sessionId: session.id, userId });
    return { ok: false, reason: 'INVALID', message: 'Failed to verify session' };
  }

  return { ok: true, sessionStatus, ledgerStatus, reason: verified ? 'MATCHED' : 'FORCED' };
}

/**
 * Placeholder for async verification flow; remains a no-op until wired to signals.
 */
export async function autoVerifySession(_sessionId: string): Promise<null> {
  logWarn('autoVerifySession is not wired to external signals yet');
  return null;
}
