import { NextResponse } from 'next/server';
import {
  CherryPointLedgerStatus,
  RecommendationStatus,
  RecommendationVerdict,
} from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { withUser } from '@/lib/with-user';
import { logError } from '@/lib/logger';

type ConfirmRequestBody = Partial<{
  actualAmountCents: number;
  usedCardId: string;
  followedRecommendation: boolean;
}>;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withUser(request, async (userId) => {
    try {
      const { id } = await params;
      if (!id || typeof id !== 'string') {
        return NextResponse.json({ error: 'session id is required' }, { status: 400 });
      }

      let body: ConfirmRequestBody;
      try {
        body = (await request.json()) as ConfirmRequestBody;
      } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
      }

      const session = await prisma.recommendationSession.findUnique({
        where: { id },
      });

      if (!session || session.userId !== userId) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }

      if (session.status === RecommendationStatus.CONFIRMED) {
        return NextResponse.json({ error: 'Session already confirmed' }, { status: 400 });
      }

      if (session.status === RecommendationStatus.DISMISSED) {
        return NextResponse.json({ error: 'Session was dismissed' }, { status: 400 });
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

      const withinBudget = session.verdict !== RecommendationVerdict.BREAKS_BUDGET;
      const pointsAwarded =
        followedRecommendation && withinBudget ? Math.max(session.cherryPointsOffered ?? 0, 0) : 0;

      const reasonBase = followedRecommendation
        ? 'FOLLOWED_RECOMMENDATION'
        : 'IGNORED_RECOMMENDATION';
      const reason = usedCardId ? `${reasonBase}:${usedCardId}` : reasonBase;

      await prisma.$transaction(async (tx) => {
        await tx.recommendationSession.update({
          where: { id: session.id },
          data: {
            status: RecommendationStatus.CONFIRMED,
            amountCents: actualAmountCents ?? session.amountCents,
          },
        });

        await tx.cherryPointLedger.create({
          data: {
            userId,
            sessionId: session.id,
            points: pointsAwarded,
            reason,
            awardedAt: new Date(),
            status: CherryPointLedgerStatus.POSTED,
            expiresAt: null,
          },
        });
      });

      const balance = await prisma.cherryPointLedger.aggregate({
        _sum: { points: true },
        where: {
          userId,
          status: { not: CherryPointLedgerStatus.REVOKED },
        },
      });

      return NextResponse.json({
        pointsAwarded,
        totalPoints: balance._sum.points ?? 0,
      });
    } catch (error) {
      logError('Error in /api/sessions/[id]/confirm POST', error);
      return NextResponse.json({ error: 'Failed to confirm session' }, { status: 500 });
    }
  });
}
