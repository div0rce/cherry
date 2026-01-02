import { prisma } from '../lib/prisma.ts';
import { ensureTsEsm } from './lib/ensure-ts-esm.mts';
import { asMessage } from './guardrails/lib/error.mts';
import { fail } from './guardrails/lib/fail.mts';

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
