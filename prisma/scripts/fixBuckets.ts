import { prisma } from '@/lib/prisma';

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
    const updates: Record<string, any> = {};

    const normalizedCategory = bucket.category.toUpperCase();
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
    console.log('Bucket reconciliation complete');
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
