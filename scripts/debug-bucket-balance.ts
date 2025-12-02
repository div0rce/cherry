import { prisma } from '../lib/prisma';
import { computeBucketBalanceFromNumbers, deriveLegacyCurrentAmount } from '../lib/buckets-runtime';

async function main() {
  const bucketId = process.env['DEBUG_BUCKET_ID'];
  if (!bucketId) {
    throw new Error('Set DEBUG_BUCKET_ID to the bucket you want to debug.');
  }

  const limitCents = 100_00;
  const postedSpendCents = 75_00;
  const pendingSpendCents = 0;
  const balance = computeBucketBalanceFromNumbers(limitCents, postedSpendCents, pendingSpendCents);

  const bucket = await prisma.bucket.update({
    where: { id: bucketId },
    data: {
      budgetAmount: balance.limitCents,
      spentCents: balance.postedSpendCents,
      currentAmount: deriveLegacyCurrentAmount(balance),
    },
  });

  // eslint-disable-next-line no-console
  console.log('Debug bucket state:', {
    id: bucket.id,
    budgetAmount: bucket.budgetAmount,
    spentCents: bucket.spentCents,
    currentAmount: bucket.currentAmount,
    pendingSpendCents,
    committedCents: balance.committedCents,
    remainingCents: balance.remainingCents,
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
