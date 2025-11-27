import { prisma } from '@/lib/prisma';

export async function getSessionStats(userId: string) {
  const total = await prisma.recommendationSession.count({
    where: { userId },
  });

  const confirmed = await prisma.recommendationSession.count({
    where: { userId, status: 'CONFIRMED' },
  });

  const expired = await prisma.recommendationSession.count({
    where: { userId, status: 'EXPIRED' },
  });

  return { total, confirmed, expired };
}
