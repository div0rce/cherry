import {
  type Prisma,
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
  // Extra writes that must commit or roll back together with the claim (Autopilot's commit row).
  inTransaction?: (tx: Prisma.TransactionClient) => Promise<void>;
};


type SessionRow = NonNullable<Awaited<ReturnType<typeof prisma.recommendationSession.findFirst>>>;
type FreshBucket = Awaited<ReturnType<typeof ensureBucketFresh>>;

type ClaimPlan = {
  spendAmount: number;
  pointsClaimed: number;
  reason: string;
  usedCardId: string | null;
  anomalyCode: SessionAnomalyCode;
  anomalyDetails: string | null;
};

type ClaimContext = { session: SessionRow; userId: string; plan: ClaimPlan; now: Date };

const isInsufficientSession = (session: SessionRow): boolean =>
  session.overallVerdict === 'INSUFFICIENT_DATA' || (session.cherryPointsOffered ?? 0) <= 0;

const isSessionExpired = (session: SessionRow, now: Date): boolean =>
  session.expiresAt <= now || session.status === RecommendationStatus.EXPIRED;

function assertNotTerminal(session: SessionRow): void {
  if (session.status === RecommendationStatus.CLAIMED || session.confirmedAmountCents != null) {
    throw new SessionConfirmError('Session already claimed', 400, 'SESSION_ALREADY_CLAIMED');
  }

  if (session.status === RecommendationStatus.VERIFIED) {
    throw new SessionConfirmError('Session already verified', 400, 'SESSION_ALREADY_VERIFIED');
  }

  if (session.status === RecommendationStatus.REJECTED) {
    throw new SessionConfirmError('Session was rejected', 400, 'SESSION_REJECTED');
  }
}

async function assertNotExpired(session: SessionRow, userId: string, now: Date): Promise<void> {
  if (!isSessionExpired(session, now)) return;
  if (session.status !== RecommendationStatus.EXPIRED) {
    await prisma.recommendationSession.updateMany({
      where: { id: session.id, userId },
      data: { status: RecommendationStatus.EXPIRED },
    });
  }
  throw new SessionConfirmError('Session expired', 400, 'SESSION_EXPIRED');
}

function parseActualAmountCents(payload: ConfirmSessionPayload): number | null {
  return typeof payload.actualAmountCents === 'number' && Number.isFinite(payload.actualAmountCents)
    ? Math.max(Math.floor(payload.actualAmountCents), 0)
    : null;
}

function parseUsedCardId(payload: ConfirmSessionPayload): string | null {
  return hasText(payload.usedCardId?.trim()) ? payload.usedCardId.trim() : null;
}

const isCardMismatch = (session: SessionRow, usedCardId: string | null): boolean =>
  hasText(session.recommendedCardId) && hasText(usedCardId) && session.recommendedCardId !== usedCardId;

const isAmountOutOfRange = (ratio: number): boolean => ratio < MIN_AMOUNT_RATIO || ratio > MAX_AMOUNT_RATIO;

function classifyAnomaly(
  ratio: number,
  deltaTimeMs: number,
  session: SessionRow,
  usedCardId: string | null
): SessionAnomalyCode {
  if (isAmountOutOfRange(ratio)) return SessionAnomalyCode.AMOUNT_MISMATCH;
  if (deltaTimeMs > MAX_CLAIM_WINDOW_MS) return SessionAnomalyCode.TIME_WINDOW_VIOLATION;
  if (isCardMismatch(session, usedCardId)) return SessionAnomalyCode.CARD_MISMATCH;
  return SessionAnomalyCode.NONE;
}

function resolveSpendAmount(actualAmountCents: number | null, session: SessionRow): number {
  const spendAmount = actualAmountCents ?? session.amountCents;
  if (!Number.isInteger(spendAmount) || spendAmount <= 0) {
    throw new SessionConfirmError('A positive amountCents is required to confirm', 400, 'INVALID_AMOUNT');
  }
  return spendAmount;
}

function buildClaimReason(payload: ConfirmSessionPayload, usedCardId: string | null): string {
  const reasonBase = Boolean(payload.followedRecommendation)
    ? 'CLAIM_FOLLOWED_RECOMMENDATION'
    : 'CLAIM_IGNORED_RECOMMENDATION';
  return hasText(usedCardId) ? `${reasonBase}:${usedCardId}` : reasonBase;
}

function detectAnomaly(
  session: SessionRow,
  actualAmountCents: number | null,
  usedCardId: string | null,
  now: Date
): Pick<ClaimPlan, 'anomalyCode' | 'anomalyDetails'> {
  const recommendedAmount = session.amountCents;
  const claimedAmount = actualAmountCents ?? recommendedAmount;
  const ratio = recommendedAmount > 0 ? claimedAmount / recommendedAmount : 1;
  const deltaAmount = Math.abs(claimedAmount - recommendedAmount);
  const deltaTimeMs = now.getTime() - session.createdAt.getTime();

  const anomalyCode = classifyAnomaly(ratio, deltaTimeMs, session, usedCardId);
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
  return { anomalyCode, anomalyDetails };
}

function buildClaimPlan(session: SessionRow, payload: ConfirmSessionPayload, now: Date): ClaimPlan {
  const actualAmountCents = parseActualAmountCents(payload);
  const usedCardId = parseUsedCardId(payload);
  const pointsClaimed = Math.max(session.cherryPointsOffered ?? 0, 0);
  const spendAmount = resolveSpendAmount(actualAmountCents, session);
  const reason = buildClaimReason(payload, usedCardId);
  return {
    spendAmount,
    pointsClaimed,
    reason,
    usedCardId,
    ...detectAnomaly(session, actualAmountCents, usedCardId, now),
  };
}

async function loadFreshBucket(
  session: SessionRow,
  userId: string,
  mode: string | null,
  now: Date
): Promise<FreshBucket> {
  if (!hasText(session.recommendedBucketId)) return null;
  const freshBucket = await ensureBucketFresh(session.recommendedBucketId, now);
  if (freshBucket !== null && freshBucket.userId !== userId) {
    logInvariant(
      `Bucket/user mismatch during session confirm (mode=${mode}, bucketId=${session.recommendedBucketId}, bucketUserId=${freshBucket.userId})`,
      { userId }
    );
    throw new SessionConfirmError('Bucket not found for user', 404, 'BUCKET_NOT_FOUND');
  }
  return freshBucket;
}

async function claimSessionRow(
  tx: Prisma.TransactionClient,
  session: SessionRow,
  userId: string,
  plan: ClaimPlan
): Promise<void> {
  const updatedSession = await tx.recommendationSession.updateMany({
    // Re-checked inside the transaction: the status checks above run outside it, so two
    // concurrent confirms could otherwise both claim.
    where: { id: session.id, userId, status: RecommendationStatus.RECOMMENDED, confirmedAmountCents: null },
    data: {
      status: RecommendationStatus.CLAIMED,
      verificationStatus: VerificationStatus.PENDING,
      anomalyCode: plan.anomalyCode,
      anomalyDetails: plan.anomalyDetails,
      amountCents: plan.spendAmount,
      recommendedCardId: session.recommendedCardId ?? plan.usedCardId ?? null,
      confirmedAmountCents: plan.spendAmount,
      bucketSpendReversed: false,
    },
  });

  if (updatedSession.count === 0) {
    // Found and claimable a moment ago, so another request claimed it first.
    throw new SessionConfirmError('Session already claimed', 400, 'SESSION_ALREADY_CLAIMED');
  }
}

async function incrementBucketSpend(
  tx: Prisma.TransactionClient,
  { session, userId, plan }: ClaimContext,
  freshBucket: FreshBucket
): Promise<void> {
  if (freshBucket === null || !hasText(session.recommendedBucketId)) return;
  const { spendAmount } = plan;
  const bucketUpdate = await tx.bucket.updateMany({
    where: { id: freshBucket.id, userId },
    // Atomic increment: a read-modify-write here lost one purchase's spend when two sessions
    // on the same bucket were confirmed at the same time.
    data: {
      spentCents: { increment: spendAmount },
    },
  });
  if (bucketUpdate.count === 0) {
    throw new SessionConfirmError('Bucket update failed due to user scoping', 400, 'BUCKET_SCOPE_ERROR');
  }
}

async function createPendingLedgerEntry(
  tx: Prisma.TransactionClient,
  { session, userId, plan, now }: ClaimContext
): Promise<void> {
  const sessionId = session.id;
  const anomalous = plan.anomalyCode !== SessionAnomalyCode.NONE;
  await tx.cherryPointLedger.create({
    data: {
      userId,
      sessionId,
      points: plan.pointsClaimed,
      reason: plan.reason,
      awardedAt: now,
      status: CherryPointLedgerStatus.PENDING,
      isAnomalous: anomalous,
      anomalyCode: anomalous ? LedgerAnomalyCode.SESSION_ANOMALOUS : LedgerAnomalyCode.NONE,
      expiresAt: null,
    },
  });
}

export async function confirmRecommendationSession({
  sessionId,
  userId,
  payload,
  mode = null,
  allowZeroPoints = false,
  now,
  inTransaction,
}: ConfirmSessionParams): Promise<ConfirmSessionResult> {
  const session = await prisma.recommendationSession.findFirst({
    where: { id: sessionId, userId },
  });

  if (session === null) {
    throw new SessionConfirmError('Session not found', 404, 'SESSION_NOT_FOUND');
  }

  if (!allowZeroPoints && isInsufficientSession(session)) {
    return {
      kind: 'insufficient',
      message: 'No points awarded: insufficient data (no card and no bucket).',
      sessionStatus: session.status,
    };
  }

  assertNotTerminal(session);
  await assertNotExpired(session, userId, now);

  const plan = buildClaimPlan(session, payload, now);
  const freshBucket = await loadFreshBucket(session, userId, mode, now);

  await prisma.$transaction(async (tx) => {
    const ctx: ClaimContext = { session, userId, plan, now };
    await claimSessionRow(tx, session, userId, plan);
    await incrementBucketSpend(tx, ctx, freshBucket);
    await createPendingLedgerEntry(tx, ctx);

    if (inTransaction !== undefined) {
      await inTransaction(tx);
    }
  });

  await autoVerifySession(session.id);

  if (plan.anomalyCode !== SessionAnomalyCode.NONE) {
    logWarn('Session claim flagged anomaly', {
      sessionId: session.id,
      userId,
      anomalyCode: plan.anomalyCode,
      anomalyDetails: plan.anomalyDetails,
    });
  }

  return {
    kind: 'confirmed',
    sessionStatus: RecommendationStatus.CLAIMED,
    ledgerStatus: CherryPointLedgerStatus.PENDING,
    pointsPending: plan.pointsClaimed,
    message: 'Claim submitted. Points are pending verification.',
  };
}
