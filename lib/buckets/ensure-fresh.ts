import type { Bucket } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { applyInMemoryRollover } from './periods';

export async function ensureBucketFresh(bucketId: string, now: Date): Promise<Bucket | null> {
  const bucket = await prisma.bucket.findUnique({ where: { id: bucketId } });
  if (!bucket) return null;

  const rolled = applyInMemoryRollover(bucket, now);
  const needsRollover =
    rolled.isExpired ||
    rolled.periodStart.getTime() !== bucket.periodStart.getTime() ||
    rolled.periodEnd.getTime() !== bucket.periodEnd.getTime();

  if (!needsRollover) return bucket;

  const updated = await prisma.bucket.update({
    where: { id: bucketId },
    data: {
      periodStart: rolled.periodStart,
      periodEnd: rolled.periodEnd,
      spentCents: rolled.spentCents,
      lastResetAt: rolled.lastResetAt ?? now,
    },
  });

  return updated;
}
