import { prisma } from '../../lib/prisma.js';
import type { Bucket } from '@prisma/client';
import { logError, logInfo } from '../../lib/logger.js';
import { computeBucketBalanceFromNumbers } from '../../lib/buckets-runtime.js';

/**
 * One-off reconciliation script to normalize buckets:
 * - Uppercases categories (so they align with reward rule categories)
 * - Ensures currentAmount mirrors the canonical remaining (budgetAmount - spentCents, clamped at 0)
 *
 * Run with:
 *   npx tsx prisma/scripts/fixBuckets.ts
 */
async function main() {
  const buckets = await prisma.bucket.findMany();
  for (const bucket of buckets) {
    const updates: Partial<Pick<Bucket, 'category' | 'currentAmount'>> = {};
    const balance = computeBucketBalanceFromNumbers(bucket.budgetAmount, bucket.spentCents, 0);
    const derivedCurrentAmount = balance.remainingCents;

    const normalizedCategory = bucket.category.toUpperCase() as Bucket['category'];
    if (normalizedCategory !== bucket.category) {
      updates.category = normalizedCategory;
    }

    if (bucket.currentAmount == null || bucket.currentAmount < 0 || bucket.currentAmount !== derivedCurrentAmount) {
      updates.currentAmount = derivedCurrentAmount;
    }

    if (Object.keys(updates).length > 0) {
      await prisma.bucket.update({
        where: { id: bucket.id },
        data: updates,
      });
    }
  }
}

main()
  .then(() => {
    logInfo('Bucket reconciliation complete');
  })
  .catch((err) => {
    logError('Bucket reconciliation failed', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
