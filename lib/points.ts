import { prisma } from '@/lib/prisma';

export async function getCherryPointsBalance(userId: string) {
  const result = await prisma.cherryPointLedger.aggregate({
    _sum: { points: true },
    where: { userId, status: 'POSTED' },
  });
  return result._sum.points ?? 0;
}
