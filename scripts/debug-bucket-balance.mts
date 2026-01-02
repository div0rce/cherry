import { prisma } from '../lib/prisma.js';
import {
  computeBucketBalanceFromNumbers,
  deriveLegacyCurrentAmount,
} from '../lib/buckets-runtime.js';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { asMessage } from './guardrails/lib/error.mjs';
import { fail } from './guardrails/lib/fail.mjs';

ensureTsEsm();

const PREFIX = 'debug-bucket-balance';
const FIX = 'Set DEBUG_BUCKET_ID to a valid bucket id.';

const hasText = (value?: string | null): value is string =>
  value !== undefined && value !== null && value !== '';

async function main() {
  const bucketId = process.env['DEBUG_BUCKET_ID'];
  if (!hasText(bucketId)) {
    throw Error('Set DEBUG_BUCKET_ID to the bucket you want to debug.');
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
    const message = asMessage(err);
    fail(PREFIX, `Debug bucket balance failed: ${message}`, { fix: FIX });
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
