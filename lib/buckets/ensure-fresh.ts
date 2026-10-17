import type { Bucket } from '@prisma/client';
import { prisma } from '../prisma.js';
import { computeBucketBalanceFromNumbers, deriveLegacyCurrentAmount } from '../buckets-runtime.js';
import { applyInMemoryRollover } from './periods.js';

type BucketClient = { bucket: typeof prisma.bucket };

export async function ensureBucketFresh(
  bucketId: string,
  now: Date,
  db: BucketClient = prisma
): Promise<Bucket | null> {
  const bucket = await db.bucket.findUnique({ where: { id: bucketId } });
  if (bucket === null) return null;

  const rolled = applyInMemoryRollover(bucket, now);
  let needsRollover = rolled.isExpired;
  if (needsRollover === false) {
    needsRollover = rolled.periodStart.getTime() !== bucket.periodStart.getTime();
  }
  if (needsRollover === false) {
    needsRollover = rolled.periodEnd.getTime() !== bucket.periodEnd.getTime();
  }

  if (needsRollover === false) return bucket;

  const balance = computeBucketBalanceFromNumbers(rolled.budgetAmount, rolled.spentCents, 0);

  // Conditional on the period this call read: if a concurrent caller already rolled the bucket
  // (and a confirm may since have incremented its spend), an unconditional write here would reset
  // that spend to the stale rollover value. In that case keep the current row.
  await db.bucket.updateMany({
    where: { id: bucketId, periodStart: bucket.periodStart, periodEnd: bucket.periodEnd },
    data: {
      periodStart: rolled.periodStart,
      periodEnd: rolled.periodEnd,
      spentCents: rolled.spentCents,
      currentAmount: deriveLegacyCurrentAmount(balance),
      lastResetAt: rolled.lastResetAt == null ? now : rolled.lastResetAt,
    },
  });

  return db.bucket.findUnique({ where: { id: bucketId } });
}
