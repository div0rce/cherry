import { prisma } from '../lib/prisma.ts';
import {
  computeBucketBalanceFromNumbers,
  deriveLegacyCurrentAmount,
} from '../lib/buckets-runtime.ts';
import { ensureTsEsm } from './lib/ensure-ts-esm.mts';

ensureTsEsm();


const hasText = (value?: string | null): value is string =>
  value !== undefined && value !== null && value !== '';

async function main() {
  const bucketId = process.env['DEBUG_BUCKET_ID'];
  if (!hasText(bucketId)) {
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

  process.stdout.write(
    `${JSON.stringify({
      id: bucket.id,
      budgetAmount: bucket.budgetAmount,
      spentCents: bucket.spentCents,
      currentAmount: bucket.currentAmount,
      pendingSpendCents,
      committedCents: balance.committedCents,
      remainingCents: balance.remainingCents,
    })}\n`
  );
}

main()
  .catch((err: unknown) => {
    process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
