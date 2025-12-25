import { createRequire } from 'node:module';
import { RecommendationStatus, RecommendationSource } from '@prisma/client';

const requireFn = createRequire(import.meta.url);
requireFn('ts-node/register/transpile-only');

const { prisma } = requireFn('../lib/prisma.ts') as typeof import('../lib/prisma.ts');
const { logInvariant } = requireFn('../lib/user-context.ts') as typeof import('../lib/user-context.ts');

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    logInvariant('cleanup_expired_vine_sessions invoked in production', {});
    throw new Error('This cleanup script is disabled in production');
  }

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
