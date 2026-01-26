import {
  CherryPointLedgerStatus,
  LedgerAnomalyCode,
  RecommendationStatus,
  SessionAnomalyCode,
  VerificationStatus,
} from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { ensureBucketFresh } from '../buckets/ensure-fresh.js';
import { ConfirmSessionSchema } from '../schemas/sessions.js';
import { logInvariant } from '../user-context.js';
import { logWarn } from '../logger.js';
import { autoVerifySession } from '../verification/verify-session.js';

export type ConfirmSessionPayload = z.infer<typeof ConfirmSessionSchema>;

export type ConfirmSessionResult =
  | {
      kind: 'insufficient';
      message: string;
      sessionStatus: RecommendationStatus;
    }
  | {
      kind: 'confirmed';
      sessionStatus: RecommendationStatus;
      ledgerStatus: CherryPointLedgerStatus;
      pointsPending: number;
      message: string;
    };

export class SessionConfirmError extends Error {
  status: number;
  code: string;
  detail?: unknown;

  constructor(message: string, status: number, code: string, detail?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

const MIN_AMOUNT_RATIO = 0.85;
const MAX_AMOUNT_RATIO = 1.15;
const MAX_CLAIM_WINDOW_MS = 24 * 60 * 60 * 1000;

const hasText = (value?: string | null): value is string =>
  value !== undefined && value !== null && value !== '';

type ConfirmSessionParams = {
  sessionId: string;
  userId: string;
  payload: ConfirmSessionPayload;
  mode?: string | null;
  allowZeroPoints?: boolean;
  now: Date;
};

export async function confirmRecommendationSession({
  sessionId,
  userId,
  payload,
  mode = null,
  allowZeroPoints = false,
  now,
}: ConfirmSessionParams): Promise<ConfirmSessionResult> {
  const session = await prisma.recommendationSession.findFirst({
    where: { id: sessionId, userId },
  });

  if (session === null) {
    throw new SessionConfirmError('Session not found', 404, 'SESSION_NOT_FOUND');
  }

  if (
    !allowZeroPoints &&
    (session.overallVerdict === 'INSUFFICIENT_DATA' || (session.cherryPointsOffered ?? 0) <= 0)
  ) {
    return {
      kind: 'insufficient',
      message: 'No points awarded: insufficient data (no card and no bucket).',
      sessionStatus: session.status,
    };
  }

  if (session.status === RecommendationStatus.CLAIMED || session.confirmedAmountCents != null) {
    throw new SessionConfirmError('Session already claimed', 400, 'SESSION_ALREADY_CLAIMED');
  }

  if (session.status === RecommendationStatus.VERIFIED) {
    throw new SessionConfirmError('Session already verified', 400, 'SESSION_ALREADY_VERIFIED');
  }

  if (session.status === RecommendationStatus.REJECTED) {
    throw new SessionConfirmError('Session was rejected', 400, 'SESSION_REJECTED');
  }

  if (session.expiresAt <= now || session.status === RecommendationStatus.EXPIRED) {
    if (session.status !== RecommendationStatus.EXPIRED) {
      await prisma.recommendationSession.updateMany({
        where: { id: session.id, userId },
        data: { status: RecommendationStatus.EXPIRED },
      });
    }
    throw new SessionConfirmError('Session expired', 400, 'SESSION_EXPIRED');
  }

  const followedRecommendation = Boolean(payload.followedRecommendation);
  const actualAmountCents =
    typeof payload.actualAmountCents === 'number' && Number.isFinite(payload.actualAmountCents)
      ? Math.max(Math.floor(payload.actualAmountCents), 0)
      : null;
  const usedCardId = hasText(payload.usedCardId?.trim()) ? payload.usedCardId.trim() : null;

  const pointsClaimed = Math.max(session.cherryPointsOffered ?? 0, 0);
  const spendAmount = actualAmountCents ?? session.amountCents;
  if (!Number.isInteger(spendAmount) || spendAmount <= 0) {
    throw new SessionConfirmError('A positive amountCents is required to confirm', 400, 'INVALID_AMOUNT');
  }

  const reasonBase = followedRecommendation
    ? 'CLAIM_FOLLOWED_RECOMMENDATION'
    : 'CLAIM_IGNORED_RECOMMENDATION';
  const reason = hasText(usedCardId) ? `${reasonBase}:${usedCardId}` : reasonBase;

  const recommendedAmount = session.amountCents;
  const claimedAmount = actualAmountCents ?? recommendedAmount;
  const ratio = recommendedAmount > 0 ? claimedAmount / recommendedAmount : 1;
  const deltaAmount = Math.abs(claimedAmount - recommendedAmount);
  const deltaTimeMs = now.getTime() - session.createdAt.getTime();

  let anomalyCode: SessionAnomalyCode = SessionAnomalyCode.NONE;
  if (ratio < MIN_AMOUNT_RATIO || ratio > MAX_AMOUNT_RATIO) {
    anomalyCode = SessionAnomalyCode.AMOUNT_MISMATCH;
  } else if (deltaTimeMs > MAX_CLAIM_WINDOW_MS) {
    anomalyCode = SessionAnomalyCode.TIME_WINDOW_VIOLATION;
  } else if (
    hasText(session.recommendedCardId) &&
    hasText(usedCardId) &&
    session.recommendedCardId !== usedCardId
  ) {
    anomalyCode = SessionAnomalyCode.CARD_MISMATCH;
  }

  const anomalyDetails =
    anomalyCode === SessionAnomalyCode.NONE
      ? null
      : JSON.stringify({
          recommendedAmount,
          claimedAmount,
          deltaAmount,
          ratio,
          deltaTimeMs,
          usedCardId,
        });

  let freshBucket: Awaited<ReturnType<typeof ensureBucketFresh>> = null;
  if (hasText(session.recommendedBucketId)) {
    freshBucket = await ensureBucketFresh(session.recommendedBucketId, now);
    if (freshBucket !== null && freshBucket.userId !== userId) {
      logInvariant(
        `Bucket/user mismatch during session confirm (mode=${mode}, bucketId=${session.recommendedBucketId}, bucketUserId=${freshBucket.userId})`,
        { userId }
      );
      throw new SessionConfirmError('Bucket not found for user', 404, 'BUCKET_NOT_FOUND');
    }
  }

  await prisma.$transaction(async (tx) => {
    const updatedSession = await tx.recommendationSession.updateMany({
      where: { id: session.id, userId },
      data: {
        status: RecommendationStatus.CLAIMED,
        verificationStatus: VerificationStatus.PENDING,
        anomalyCode,
        anomalyDetails,
        amountCents: spendAmount,
        recommendedCardId: session.recommendedCardId ?? usedCardId ?? null,
        confirmedAmountCents: spendAmount,
        bucketSpendReversed: false,
      },
    });

    if (updatedSession.count === 0) {
      throw new SessionConfirmError('Session update failed due to user scoping', 400, 'SESSION_SCOPE_ERROR');
    }

    if (freshBucket !== null && hasText(session.recommendedBucketId)) {
      const bucketUpdate = await tx.bucket.updateMany({
        where: { id: freshBucket.id, userId },
        data: {
          spentCents: (freshBucket.spentCents ?? 0) + spendAmount,
        },
      });
      if (bucketUpdate.count === 0) {
        throw new SessionConfirmError('Bucket update failed due to user scoping', 400, 'BUCKET_SCOPE_ERROR');
      }
    }

    await tx.cherryPointLedger.create({
      data: {
        userId,
        sessionId: session.id,
        points: pointsClaimed,
        reason,
        awardedAt: now,
        status: CherryPointLedgerStatus.PENDING,
        isAnomalous: anomalyCode !== SessionAnomalyCode.NONE,
        anomalyCode:
          anomalyCode === SessionAnomalyCode.NONE ? LedgerAnomalyCode.NONE : LedgerAnomalyCode.SESSION_ANOMALOUS,
        expiresAt: null,
      },
    });
  });

  await autoVerifySession(session.id);

  if (anomalyCode !== SessionAnomalyCode.NONE) {
    logWarn('Session claim flagged anomaly', {
      sessionId: session.id,
      userId,
      anomalyCode,
      anomalyDetails,
    });
  }

  return {
    kind: 'confirmed',
    sessionStatus: RecommendationStatus.CLAIMED,
    ledgerStatus: CherryPointLedgerStatus.PENDING,
    pointsPending: pointsClaimed,
    message: 'Claim submitted. Points are pending verification.',
  };
}
