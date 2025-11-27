import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withUser } from '@/lib/with-user';
import { logError, logInfo } from '@/lib/logger';

export async function POST(request: Request) {
  return withUser(request, async (userId) => {
    try {
      const results = await prisma.$transaction(async (tx) => {
        const ledger = await tx.cherryPointLedger.deleteMany({ where: { userId } });
        const sessions = await tx.recommendationSession.deleteMany({ where: { userId } });
        const transactions = await tx.simulatedTransaction.deleteMany({ where: { userId } });
        const simulations = await tx.simulation.deleteMany({ where: { userId } });
        const buckets = await tx.bucket.deleteMany({ where: { userId } });
        const cards = await tx.card.deleteMany({ where: { userId } });
        return { ledger, sessions, transactions, simulations, buckets, cards };
      });

      const summary = {
        cherryPointLedger: results.ledger.count,
        recommendationSessions: results.sessions.count,
        simulatedTransactions: results.transactions.count,
        simulations: results.simulations.count,
        buckets: results.buckets.count,
        cards: results.cards.count,
      };

      logInfo('Cleared user data via admin endpoint', { userId, summary });

      return NextResponse.json({ message: 'User data cleared', deleted: summary });
    } catch (error) {
      logError('Failed to clear user data', error);
      return new NextResponse('Failed to clear user data', { status: 500 });
    }
  });
}
