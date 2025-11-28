import { prisma } from '@/lib/prisma';

export async function getSessionStats(userId: string) {
  const total = await prisma.recommendationSession.count({
    where: { userId },
  });

  const claimed = await prisma.recommendationSession.count({
    where: { userId, status: 'CLAIMED' },
  });

  const verified = await prisma.recommendationSession.count({
    where: { userId, status: 'VERIFIED' },
  });

  const expired = await prisma.recommendationSession.count({
    where: { userId, status: 'EXPIRED' },
  });

  return { total, claimed, verified, expired };
}
