import { RecommendationStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export async function getSessionStats(userId: string) {
  const total = await prisma.recommendationSession.count({
    where: { userId },
  });

  const claimed = await prisma.recommendationSession.count({
    where: { userId, status: RecommendationStatus.CLAIMED },
  });

  const verified = await prisma.recommendationSession.count({
    where: { userId, status: RecommendationStatus.VERIFIED },
  });

  const expired = await prisma.recommendationSession.count({
    where: { userId, status: RecommendationStatus.EXPIRED },
  });

  return { total, claimed, verified, expired };
}
