import { NextResponse } from 'next/server';
import { RecommendationStatus, CherryPointLedgerStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { withUser } from '@/lib/with-user';

export async function GET(request: Request) {
  return withUser(request, async (userId) => {
    const sessions = await prisma.recommendationSession.findMany({
      where: {
        userId,
        status: RecommendationStatus.CLAIMED,
        ledgerEntries: {
          some: {
            status: CherryPointLedgerStatus.PENDING,
          },
        },
      },
      include: {
        ledgerEntries: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({
      sessions: sessions.map((s) => ({
        id: s.id,
        merchantName: s.merchantName,
        amountCents: s.amountCents,
        category: s.category,
        createdAt: s.createdAt,
        status: s.status,
        budgetVerdict: s.budgetVerdict,
        cardVerdict: s.cardVerdict,
        overallVerdict: s.overallVerdict,
        pendingPoints: s.ledgerEntries
          .filter((l) => l.status === CherryPointLedgerStatus.PENDING)
          .reduce((sum, l) => sum + l.points, 0),
      })),
    });
  });
}
