import type { JSX } from 'react';
import { getCurrentUserIdOrRedirect } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { toBucketRuntime, type BucketRuntime } from '@/lib/buckets-runtime';
import { BucketsClient } from './BucketsClient';

export default async function UserBucketsPage(): Promise<JSX.Element> {
  const userId = await getCurrentUserIdOrRedirect('/buckets');

  let buckets: BucketRuntime[] = [];
  let error: string | null = null;

  try {
    const rawBuckets = await prisma.bucket.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    buckets = rawBuckets.map((bucket) => toBucketRuntime(bucket));
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load buckets';
  }

  return <BucketsClient initialBuckets={buckets} initialError={error} />;
}
