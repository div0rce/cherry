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
import { withUser } from '@/lib/with-user';
import { logError } from '@/lib/logger';
import { VerifySessionSchema } from '@/lib/schemas/sessions';
import { parseJsonBody } from '@/lib/validation';
import { ensureBucketFresh } from '@/lib/buckets/ensure-fresh';
import { computeBucketReversal } from '@/lib/sessions/reversal';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  return withUser(request, async (userId) => {
    try {
      const { id } = await params;
      if (!id || typeof id !== 'string') {
        return NextResponse.json({ error: 'session id is required' }, { status: 400 });
      }

      const parsed = await parseJsonBody(request, VerifySessionSchema);
      if (!parsed.ok) return parsed.response;
      const body = parsed.data;

      const session = await prisma.recommendationSession.findUnique({
        where: { id },
      });

      if (!session || session.userId !== userId) {
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
        await tx.recommendationSession.update({
          where: { id: session.id },
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

        await tx.cherryPointLedger.updateMany({
          where: { sessionId: session.id, status: CherryPointLedgerStatus.PENDING },
          data: {
            status: ledgerStatus,
            postedAt: ledgerStatus === CherryPointLedgerStatus.POSTED ? now : null,
            revokedAt: ledgerStatus === CherryPointLedgerStatus.REVOKED ? now : null,
            isAnomalous: anomalyCode !== SessionAnomalyCode.NONE,
            anomalyCode: ledgerAnomaly,
          },
        });

        if (reversalBucketUpdate) {
          await tx.bucket.update({
            where: { id: reversalBucketUpdate.bucketId },
            data: { spentCents: reversalBucketUpdate.newSpentCents },
          });
        }
      });

      return NextResponse.json({
        ok: true,
        sessionStatus,
        ledgerStatus,
      });
    } catch (error) {
      logError('Error in /api/sessions/[id]/verify', error);
      return NextResponse.json({ error: 'Failed to verify session' }, { status: 500 });
    }
  });
}
