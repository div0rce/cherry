import { RecommendationStatus, RecommendationSource } from '@prisma/client';
import { prisma } from '../lib/prisma.ts';
import { logInvariant } from '../lib/user-context.ts';
import { ensureTsEsm } from './lib/ensure-ts-esm.mts';
import { asMessage } from './guardrails/lib/error.mts';
import { fail } from './guardrails/lib/fail.mts';

ensureTsEsm();

const PREFIX = 'cleanup-expired-vine-sessions';
const FIX = 'Run only in non-production environments with valid Prisma access.';

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    logInvariant('cleanup_expired_vine_sessions invoked in production', {});
    fail(PREFIX, 'This cleanup script is disabled in production', { fix: FIX });
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
  })
  .catch((err: unknown) => {
    const message = asMessage(err);
    fail(PREFIX, `Cleanup failed: ${message}`, { fix: FIX });
  });
