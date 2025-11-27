import { prisma } from '@/lib/prisma';

export async function getLedgerStats(userId: string) {
  const entries = await prisma.cherryPointLedger.count({
    where: { userId },
  });

  const sum = await prisma.cherryPointLedger.aggregate({
    _sum: { points: true },
    where: { userId, status: 'POSTED' },
  });

  return {
    entries,
    points: sum._sum.points ?? 0,
  };
}
