import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  CherryPointLedgerStatus,
  LedgerAnomalyCode,
  RecommendationStatus,
  SessionAnomalyCode,
  VerificationStatus,
} from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { logError, logWarn } from '@/lib/logger';
import { ConfirmSessionSchema } from '@/lib/schemas/sessions';
import { parseJsonBody } from '@/lib/validation';
import { autoVerifySession } from '@/lib/verification/verify-session';
import { ensureBucketFresh } from '@/lib/buckets/ensure-fresh';
import {
  assertUserId,
  isPrismaP2003,
  logInvariant,
  resolveUserContext,
} from '@/lib/user-context';

const MIN_AMOUNT_RATIO = 0.85;
const MAX_AMOUNT_RATIO = 1.15;
const MAX_CLAIM_WINDOW_MS = 24 * 60 * 60 * 1000;

const hasText = (value?: string | null): value is string =>
  value !== undefined && value !== null && value !== '';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  let userId: string | null = null;
  let mode: string | null = null;

  try {
    const ctx = await resolveUserContext({
      requireAuth: true,
      allowLabDemo: false,
    });
    userId = ctx.userId;
    mode = ctx.mode;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    logError('Error resolving user context in api/sessions/[id]/confirm POST', error);
    return NextResponse.json({ error: 'Failed to resolve user context' }, { status: 500 });
  }

  try {
    assertUserId(userId, 'api/sessions/[id]/confirm POST');

    const { id } = await params;
    if (!hasText(id)) {
      return NextResponse.json({ error: 'session id is required' }, { status: 400 });
    }

    const parsed = await parseJsonBody(request, ConfirmSessionSchema);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;

    const session = await prisma.recommendationSession.findFirst({
      where: { id, userId },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.overallVerdict === 'INSUFFICIENT_DATA' || (session.cherryPointsOffered ?? 0) <= 0) {
      return NextResponse.json({
        ok: true,
        message: 'No points awarded: insufficient data (no card and no bucket).',
        sessionStatus: session.status,
      });
    }

    if (session.status === RecommendationStatus.CLAIMED || session.confirmedAmountCents != null) {
      return NextResponse.json({ error: 'Session already claimed' }, { status: 400 });
    }

    if (session.status === RecommendationStatus.VERIFIED) {
      return NextResponse.json({ error: 'Session already verified' }, { status: 400 });
    }

    if (session.status === RecommendationStatus.REJECTED) {
      return NextResponse.json({ error: 'Session was rejected' }, { status: 400 });
    }

    const now = new Date();
    if (session.expiresAt <= now || session.status === RecommendationStatus.EXPIRED) {
      if (session.status !== RecommendationStatus.EXPIRED) {
        await prisma.recommendationSession.updateMany({
          where: { id: session.id, userId },
          data: { status: RecommendationStatus.EXPIRED },
        });
      }
      return NextResponse.json({ error: 'Session expired' }, { status: 400 });
    }

    const followedRecommendation = Boolean(body.followedRecommendation);
    const actualAmountCents =
      typeof body.actualAmountCents === 'number' && Number.isFinite(body.actualAmountCents)
        ? Math.max(Math.floor(body.actualAmountCents), 0)
        : null;
    const usedCardId = hasText(body.usedCardId?.trim()) ? body.usedCardId.trim() : null;

    const pointsClaimed = Math.max(session.cherryPointsOffered ?? 0, 0);
    const spendAmount = actualAmountCents ?? session.amountCents;
    if (!Number.isInteger(spendAmount) || spendAmount <= 0) {
      return NextResponse.json({ error: 'A positive amountCents is required to confirm' }, { status: 400 });
    }

    const reasonBase = followedRecommendation
      ? 'CLAIM_FOLLOWED_RECOMMENDATION'
      : 'CLAIM_IGNORED_RECOMMENDATION';
    const reason = hasText(usedCardId) ? `${reasonBase}:${usedCardId}` : reasonBase;

    const recommendedAmount = session.amountCents;
    const claimedAmount = actualAmountCents ?? recommendedAmount;
    const ratio = recommendedAmount > 0 ? claimedAmount / recommendedAmount : 1;
    const deltaAmount = Math.abs(claimedAmount - recommendedAmount);
    const deltaTimeMs = Date.now() - session.createdAt.getTime();

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

    // Freshen bucket before transactional updates to avoid stale periods.
    let freshBucket = null;
    if (hasText(session.recommendedBucketId)) {
      freshBucket = await ensureBucketFresh(session.recommendedBucketId, new Date());
      if (freshBucket !== null && freshBucket.userId !== userId) {
        logInvariant('Bucket/user mismatch in api/sessions/[id]/confirm POST', {
          userId,
          mode,
          bucketId: session.recommendedBucketId,
          bucketUserId: freshBucket.userId,
        });
        return NextResponse.json({ error: 'Bucket not found for user' }, { status: 404 });
      }
    }

    // Update session + ledger + bucket spend (once, on first claim)
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
        throw new Error('Session update failed due to user scoping');
      }

      if (freshBucket !== null && hasText(session.recommendedBucketId)) {
        const bucketUpdate = await tx.bucket.updateMany({
          where: { id: freshBucket.id, userId },
          data: {
            spentCents: (freshBucket.spentCents ?? 0) + spendAmount,
          },
        });
        if (bucketUpdate.count === 0) {
          throw new Error('Bucket update failed due to user scoping');
        }
      }

      await tx.cherryPointLedger.create({
        data: {
          userId,
          sessionId: session.id,
          points: pointsClaimed,
          reason,
          awardedAt: new Date(),
          status: CherryPointLedgerStatus.PENDING,
          isAnomalous: anomalyCode !== SessionAnomalyCode.NONE,
          anomalyCode:
            anomalyCode === SessionAnomalyCode.NONE
              ? LedgerAnomalyCode.NONE
              : LedgerAnomalyCode.SESSION_ANOMALOUS,
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

    return NextResponse.json({
      sessionStatus: RecommendationStatus.CLAIMED,
      ledgerStatus: CherryPointLedgerStatus.PENDING,
      pointsPending: pointsClaimed,
      message: 'Claim submitted. Points are pending verification.',
    });
  } catch (error) {
    if (isPrismaP2003(error)) {
      logInvariant('P2003 in api/sessions/[id]/confirm POST', { userId, mode, meta: error.meta });
    } else {
      logInvariant('Error in api/sessions/[id]/confirm POST', { userId, mode, error });
      logError('Error in /api/sessions/[id]/confirm POST', error);
    }
    return NextResponse.json({ error: 'Failed to confirm session' }, { status: 500 });
  }
}
