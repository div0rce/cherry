import type { Bucket } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { computeBucketBalanceFromNumbers, deriveLegacyCurrentAmount } from '../buckets-runtime';
import { applyInMemoryRollover } from './periods';

type BucketClient = { bucket: typeof prisma.bucket };

export async function ensureBucketFresh(
  bucketId: string,
  now: Date,
  db: BucketClient = prisma
): Promise<Bucket | null> {
  const bucket = await db.bucket.findUnique({ where: { id: bucketId } });
  if (!bucket) return null;

  const rolled = applyInMemoryRollover(bucket, now);
  const needsRollover =
    rolled.isExpired ||
    rolled.periodStart.getTime() !== bucket.periodStart.getTime() ||
    rolled.periodEnd.getTime() !== bucket.periodEnd.getTime();

  if (!needsRollover) return bucket;

  const balance = computeBucketBalanceFromNumbers(rolled.budgetAmount, rolled.spentCents, 0);

  const updated = await db.bucket.update({
    where: { id: bucketId },
    data: {
      periodStart: rolled.periodStart,
      periodEnd: rolled.periodEnd,
      spentCents: rolled.spentCents,
      currentAmount: deriveLegacyCurrentAmount(balance),
      lastResetAt: rolled.lastResetAt ?? now,
    },
  });

  return updated;
}
