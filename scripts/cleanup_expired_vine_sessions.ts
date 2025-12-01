import { prisma } from '@/lib/prisma';
import { RecommendationStatus, RecommendationSource } from '@prisma/client';

async function main(): Promise<void> {
  const now = new Date();
  const result = await prisma.recommendationSession.updateMany({
    where: {
      source: { in: [RecommendationSource.VINE_SIM, RecommendationSource.VINE_DEVICE] },
      expiresAt: { lt: now },
      status: RecommendationStatus.RECOMMENDED,
    },
    data: {
      status: RecommendationStatus.EXPIRED,
    },
  });

  console.warn(`Marked ${result.count} Vine recommendation sessions as EXPIRED`);
}

main()
  .then(() => {
    console.warn('cleanup_expired_vine_sessions complete');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

