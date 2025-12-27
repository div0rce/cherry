import { prisma } from './prisma';

export async function getCherryPointsBalance(userId: string): Promise<number> {
  const result = await prisma.cherryPointLedger.aggregate({
    _sum: { points: true },
    where: { userId, status: 'POSTED' },
  });
  return result._sum.points ?? 0;
}
