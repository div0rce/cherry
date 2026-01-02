import { prisma } from '../lib/prisma.js';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { asMessage } from './guardrails/lib/error.mjs';
import { fail } from './guardrails/lib/fail.mjs';

ensureTsEsm();

const PREFIX = 'backfill-bucket-last-reset-at';
const FIX = 'Ensure prisma is connected and the Bucket model is migrated.';

async function main(): Promise<void> {
  const buckets = await prisma.bucket.findMany({
    where: { lastResetAt: null },
    select: { id: true, periodStart: true, createdAt: true },
  });

  for (const bucket of buckets) {
    const lastResetAt = bucket.periodStart ?? bucket.createdAt;
    await prisma.bucket.update({
      where: { id: bucket.id },
      data: { lastResetAt },
    });
  }
  console.warn(`Backfilled lastResetAt for ${buckets.length} buckets`);
}

main()
  .catch((err: unknown) => {
    const message = asMessage(err);
    fail(PREFIX, `Backfill failed: ${message}`, { fix: FIX });
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
