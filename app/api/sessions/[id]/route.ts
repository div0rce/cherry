import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { withUser } from '../../../../lib/with-user';
import { prisma } from '../../../../lib/prisma';
import { logError } from '../../../../lib/logger';
import { asAppError } from '../../../../lib/errors';

const hasText = (value?: string | null): value is string =>
  value !== undefined && value !== null && value !== '';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  return withUser(request, async (userId) => {
    try {
      const { id } = await params;
      if (!hasText(id)) {
        return NextResponse.json({ error: 'session id is required' }, { status: 400 });
      }

      const session = await prisma.recommendationSession.findFirst({
        where: { id, userId },
        include: {
          ledgerEntries: true,
        },
      });

      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }

      const now = new Date();
      const isExpired = session.expiresAt <= now;

      const postedPoints =
        session.ledgerEntries
          ?.filter((entry) => entry.status === 'POSTED')
          .reduce((acc, entry) => acc + entry.points, 0) ?? 0;

      const pendingPoints =
        session.ledgerEntries
          ?.filter((entry) => entry.status === 'PENDING')
          .reduce((acc, entry) => acc + entry.points, 0) ?? 0;

      return NextResponse.json({
        id: session.id,
        source: session.source,
        orderToken: session.orderToken,
        merchantName: session.merchantName,
        mccCode: session.mccCode,
        category: session.category,
        amountCents: session.amountCents,
        currency: session.currency,
        verdict: session.verdict,
        budgetVerdict: session.budgetVerdict,
        cardVerdict: session.cardVerdict,
        overallVerdict: session.overallVerdict,
        coverageMode: session.coverageMode,
        recommendedCardId: session.recommendedCardId,
        recommendedBucketId: session.recommendedBucketId,
        cherryPointsOffered: session.cherryPointsOffered,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
        status: session.status,
        verificationStatus: session.verificationStatus,
        anomalyCode: session.anomalyCode,
        isExpired,
        pointsPosted: postedPoints,
        pointsPending: pendingPoints,
      });
    } catch (error: unknown) {
      const appError = asAppError(error);
      logError('Error in GET /api/sessions/[id]', appError);
      return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 });
    }
  });
}
