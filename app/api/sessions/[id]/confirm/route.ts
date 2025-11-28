import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { CherryPointLedgerStatus, RecommendationStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { withUser } from '@/lib/with-user';
import { logError } from '@/lib/logger';
import { ConfirmSessionSchema } from '@/lib/schemas/sessions';
import { parseJsonBody } from '@/lib/validation';

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

      const parsed = await parseJsonBody(request, ConfirmSessionSchema);
      if (!parsed.ok) return parsed.response;
      const body = parsed.data;

      const session = await prisma.recommendationSession.findUnique({
        where: { id },
      });

      if (!session || session.userId !== userId) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }

      if (session.overallVerdict === 'INSUFFICIENT_DATA' || (session.cherryPointsOffered ?? 0) <= 0) {
        return NextResponse.json({
          ok: true,
          message: 'No points awarded: insufficient data (no card and no bucket).',
          sessionStatus: session.status,
        });
      }

      if (session.status === RecommendationStatus.CLAIMED) {
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
          await prisma.recommendationSession.update({
            where: { id: session.id },
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
      const usedCardId =
        typeof body.usedCardId === 'string' && body.usedCardId.trim().length > 0
          ? body.usedCardId.trim()
          : null;

      const pointsClaimed = Math.max(session.cherryPointsOffered ?? 0, 0);

      const reasonBase = followedRecommendation
        ? 'CLAIM_FOLLOWED_RECOMMENDATION'
        : 'CLAIM_IGNORED_RECOMMENDATION';
      const reason = usedCardId ? `${reasonBase}:${usedCardId}` : reasonBase;

      await prisma.$transaction(async (tx) => {
        await tx.recommendationSession.update({
          where: { id: session.id },
          data: {
            status: RecommendationStatus.CLAIMED,
            amountCents: actualAmountCents ?? session.amountCents,
            recommendedCardId: session.recommendedCardId ?? usedCardId ?? null,
          },
        });

        await tx.cherryPointLedger.create({
          data: {
            userId,
            sessionId: session.id,
            points: pointsClaimed,
            reason,
            awardedAt: new Date(),
            status: CherryPointLedgerStatus.PENDING,
            expiresAt: null,
          },
        });
      });

      return NextResponse.json({
        sessionStatus: RecommendationStatus.CLAIMED,
        ledgerStatus: CherryPointLedgerStatus.PENDING,
        pointsPending: pointsClaimed,
        message: 'Claim submitted. Points are pending verification.',
      });
    } catch (error) {
      logError('Error in /api/sessions/[id]/confirm POST', error);
      return NextResponse.json({ error: 'Failed to confirm session' }, { status: 500 });
    }
  });
}
