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
import { logError } from '@/lib/logger';
import { VerifySessionSchema } from '@/lib/schemas/sessions';
import { parseJsonBody } from '@/lib/validation';
import { ensureBucketFresh } from '@/lib/buckets/ensure-fresh';
import { computeBucketReversal } from '@/lib/sessions/reversal';
import {
  assertUserId,
  isPrismaP2003,
  logInvariant,
  resolveUserContext,
} from '@/lib/user-context';

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
    logError('Error resolving user context in api/sessions/[id]/verify POST', error);
    return NextResponse.json({ error: 'Failed to resolve user context' }, { status: 500 });
  }

  try {
    assertUserId(userId, 'api/sessions/[id]/verify POST');

    const { id } = await params;
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'session id is required' }, { status: 400 });
    }

    const parsed = await parseJsonBody(request, VerifySessionSchema);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;

    const session = await prisma.recommendationSession.findFirst({
      where: { id, userId },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (
      session.status === RecommendationStatus.VERIFIED ||
      session.status === RecommendationStatus.REJECTED
    ) {
      return NextResponse.json(
        { error: 'Session already finalized', sessionStatus: session.status },
        { status: 400 }
      );
    }

    const now = new Date();
    let sessionStatus: RecommendationStatus;
    let ledgerStatus: CherryPointLedgerStatus;
    let anomalyCode: SessionAnomalyCode = session.anomalyCode;

    if (body.verified) {
      sessionStatus = RecommendationStatus.VERIFIED;
      ledgerStatus = CherryPointLedgerStatus.POSTED;
    } else {
      sessionStatus = RecommendationStatus.REJECTED;
      ledgerStatus = CherryPointLedgerStatus.REVOKED;
      if (anomalyCode === SessionAnomalyCode.NONE) {
        anomalyCode = SessionAnomalyCode.VERIFICATION_CONFLICT;
      }
    }

    const ledgerAnomaly =
      anomalyCode === SessionAnomalyCode.NONE
        ? LedgerAnomalyCode.NONE
        : LedgerAnomalyCode.SESSION_ANOMALOUS;

    let reversalBucketUpdate: { bucketId: string; newSpentCents: number } | null = null;
    let freshBucketId: string | null = null;
    let freshBucketSpent: number | null = null;
    if (session.recommendedBucketId) {
      const freshBucket = await ensureBucketFresh(session.recommendedBucketId, new Date());
      if (freshBucket && freshBucket.userId !== userId) {
        logInvariant('Bucket/user mismatch in api/sessions/[id]/verify POST', {
          userId,
          mode,
          bucketId: session.recommendedBucketId,
          bucketUserId: freshBucket.userId,
        });
        return NextResponse.json({ error: 'Bucket not found for user' }, { status: 404 });
      }
      if (freshBucket) {
        freshBucketId = freshBucket.id;
        freshBucketSpent = freshBucket.spentCents ?? 0;
      }
    }

    reversalBucketUpdate = computeBucketReversal({
      verified: body.verified,
      confirmedAmountCents: session.confirmedAmountCents ?? null,
      bucketSpendReversed: session.bucketSpendReversed ?? false,
      bucketId: freshBucketId,
      currentBucketSpentCents: freshBucketSpent,
    });

    await prisma.$transaction(async (tx) => {
      const updatedSession = await tx.recommendationSession.updateMany({
        where: { id: session.id, userId },
        data: {
          status: sessionStatus,
          verificationStatus: body.verified
            ? VerificationStatus.VERIFIED
            : VerificationStatus.FAILED,
          anomalyCode,
          verifiedAt: body.verified ? now : null,
          rejectedAt: body.verified ? null : now,
          ...(reversalBucketUpdate
            ? {
                bucketSpendReversed: true,
              }
            : {}),
        },
      });

      if (updatedSession.count === 0) {
        throw new Error('Session update failed due to user scoping');
      }

      await tx.cherryPointLedger.updateMany({
        where: { sessionId: session.id, status: CherryPointLedgerStatus.PENDING, userId },
        data: {
          status: ledgerStatus,
          postedAt: ledgerStatus === CherryPointLedgerStatus.POSTED ? now : null,
          revokedAt: ledgerStatus === CherryPointLedgerStatus.REVOKED ? now : null,
          isAnomalous: anomalyCode !== SessionAnomalyCode.NONE,
          anomalyCode: ledgerAnomaly,
        },
      });

      if (reversalBucketUpdate) {
        const bucketUpdate = await tx.bucket.updateMany({
          where: { id: reversalBucketUpdate.bucketId, userId },
          data: { spentCents: reversalBucketUpdate.newSpentCents },
        });

        if (bucketUpdate.count === 0) {
          throw new Error('Bucket update failed due to user scoping');
        }
      }
    });

    return NextResponse.json({
      ok: true,
      sessionStatus,
      ledgerStatus,
    });
  } catch (error) {
    if (isPrismaP2003(error)) {
      logInvariant('P2003 in api/sessions/[id]/verify POST', { userId, mode, meta: error.meta });
    } else {
      logInvariant('Error in api/sessions/[id]/verify POST', { userId, mode, error });
      logError('Error in /api/sessions/[id]/verify', error);
    }
    return NextResponse.json({ error: 'Failed to verify session' }, { status: 500 });
  }
}
