import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withUser } from '@/lib/with-user';
import { logError, logInfo } from '@/lib/logger';

export async function POST(request: Request) {
  return withUser(request, async (userId) => {
    try {
      const [transactions, simulations, buckets, cards] = await prisma.$transaction([
        prisma.simulatedTransaction.deleteMany({ where: { userId } }),
        prisma.simulation.deleteMany({ where: { userId } }),
        prisma.bucket.deleteMany({ where: { userId } }),
        prisma.card.deleteMany({ where: { userId } }),
      ]);

      const summary = {
        simulatedTransactions: transactions.count,
        simulations: simulations.count,
        buckets: buckets.count,
        cards: cards.count,
      };

      logInfo('Cleared user data via admin endpoint', { userId, summary });

      return NextResponse.json({ message: 'User data cleared', deleted: summary });
    } catch (error) {
      logError('Failed to clear user data', error);
      return new NextResponse('Failed to clear user data', { status: 500 });
    }
  });
}
