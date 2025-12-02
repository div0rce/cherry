import {
  CherryPointLedgerStatus,
  LedgerAnomalyCode,
  RecommendationStatus,
  SessionAnomalyCode,
  VerificationStatus,
} from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ensureBucketFresh } from '@/lib/buckets/ensure-fresh';
import { computeBucketReversal } from '@/lib/sessions/reversal';
import { logError, logWarn } from '@/lib/logger';
import type { VerificationResult, VerificationSignal } from './types';

const AMOUNT_TOLERANCE_RATIO = 0.05;
const AMOUNT_TOLERANCE_MIN_CENTS = 100;
const TIME_TOLERANCE_MS = 24 * 60 * 60 * 1000;

function amountsMatch(signalAmount: number, targetAmount: number): boolean {
  const delta = Math.abs(signalAmount - targetAmount);
  const tolerance = Math.max(AMOUNT_TOLERANCE_MIN_CENTS, Math.floor(targetAmount * AMOUNT_TOLERANCE_RATIO));
  return delta <= tolerance;
}

function merchantsMatch(signalMerchant?: string | null, targetMerchant?: string | null): boolean {
  if (!signalMerchant || !targetMerchant) return true;
  return signalMerchant.trim().toLowerCase() === targetMerchant.trim().toLowerCase();
}

function isFinalStatus(status: RecommendationStatus): boolean {
  return status === RecommendationStatus.VERIFIED || status === RecommendationStatus.REJECTED;
}

export async function verifySessionFromSignal(signal: VerificationSignal): Promise<VerificationResult> {
  if (!signal.sessionId || !signal.userId) {
    return { ok: false, reason: 'INVALID', message: 'sessionId and userId are required' };
  }

  const session = await prisma.recommendationSession.findFirst({
    where: { id: signal.sessionId, userId: signal.userId },
  });

  if (!session) {
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

  const targetAmount = session.confirmedAmountCents ?? session.amountCents;
  const signalAmount = signal.amountCents ?? targetAmount;
  const occurredAt = signal.occurredAt ?? new Date();
  const amountMatches = amountsMatch(signalAmount, targetAmount);
  const timeMatches = Math.abs(occurredAt.getTime() - session.createdAt.getTime()) <= TIME_TOLERANCE_MS;
  const merchantMatches = merchantsMatch(signal.merchantFingerprint, session.merchantName);

  const inferredVerified = amountMatches && timeMatches && merchantMatches;
  const verified = signal.verified ?? inferredVerified;
  const sessionStatus = verified ? RecommendationStatus.VERIFIED : RecommendationStatus.REJECTED;
  const ledgerStatus = verified ? CherryPointLedgerStatus.POSTED : CherryPointLedgerStatus.REVOKED;
  const anomalyCode =
    verified || session.anomalyCode !== SessionAnomalyCode.NONE
      ? session.anomalyCode
      : SessionAnomalyCode.VERIFICATION_CONFLICT;

  let reversalBucketUpdate: { bucketId: string; newSpentCents: number } | null = null;
  if (!verified && session.recommendedBucketId) {
    const freshBucket = await ensureBucketFresh(session.recommendedBucketId, new Date());
    if (freshBucket && freshBucket.userId !== signal.userId) {
      return { ok: false, reason: 'INVALID', message: 'Bucket/user mismatch' };
    }
    reversalBucketUpdate = computeBucketReversal({
      verified,
      confirmedAmountCents: session.confirmedAmountCents ?? null,
      bucketSpendReversed: session.bucketSpendReversed ?? false,
      bucketId: freshBucket?.id ?? null,
      currentBucketSpentCents: freshBucket?.spentCents ?? null,
    });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const updatedSession = await tx.recommendationSession.updateMany({
        where: { id: session.id, userId: signal.userId },
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
        where: { sessionId: session.id, userId: signal.userId, status: CherryPointLedgerStatus.PENDING },
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

      if (reversalBucketUpdate) {
        const bucketUpdate = await tx.bucket.updateMany({
          where: { id: reversalBucketUpdate.bucketId, userId: signal.userId },
          data: { spentCents: reversalBucketUpdate.newSpentCents },
        });
        if (bucketUpdate.count === 0) {
          throw new Error('Bucket update failed due to user scoping');
        }
      }
    });
  } catch (err) {
    logError('verify_session_failed', { err, sessionId: session.id, userId: signal.userId });
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
