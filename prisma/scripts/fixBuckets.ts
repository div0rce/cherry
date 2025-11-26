import { prisma } from '@/lib/prisma';
import type { Bucket } from '@prisma/client';
import { logError, logInfo } from '@/lib/logger';

/**
 * One-off reconciliation script to normalize buckets:
 * - Uppercases categories (so they align with reward rule categories)
 * - Ensures currentAmount is initialized and not negative; resets missing/negative to budgetAmount
 *
 * Run with:
 *   npx tsx prisma/scripts/fixBuckets.ts
 */
async function main() {
  const buckets = await prisma.bucket.findMany();
  for (const bucket of buckets) {
    const updates: Partial<Pick<Bucket, 'category' | 'currentAmount'>> = {};

    const normalizedCategory = bucket.category.toUpperCase() as Bucket['category'];
    if (normalizedCategory !== bucket.category) {
      updates.category = normalizedCategory;
    }

    if (bucket.currentAmount == null || bucket.currentAmount < 0) {
      updates.currentAmount = bucket.budgetAmount;
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
