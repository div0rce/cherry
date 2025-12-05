import type { JSX } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorBanner } from '@/components/ErrorBanner';
import { getCurrentUserIdOrRedirect } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { toBucketRuntime, type BucketRuntime } from '@/lib/buckets-runtime';

function formatCents(cents: number | null | undefined): string {
  if (typeof cents !== 'number' || Number.isNaN(cents)) return '—';
  return `$${(cents / 100).toFixed(2)}`;
}

function formatPeriod(period: BucketRuntime['period']): string {
  return period === 'WEEKLY' ? 'Weekly' : 'Monthly';
}

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

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 space-y-6">
      <PageHeader
        title="Buckets"
        description="Buckets show how your money is divided. You don’t manage here; you just see where Autopilot is sending things."
      />

      {error !== null ? (
        <ErrorBanner message={error} />
      ) : buckets.length === 0 ? (
        <EmptyState
          title="No buckets yet"
          description="Create a few envelopes (e.g., Essentials, Fun) so Cherry can protect your runway."
        />
      ) : (
        <div className="space-y-3">
          {buckets.map((bucket) => (
            <Card key={bucket.id} tone="base" padding="md" className="border border-ink-700/60">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-lg font-semibold text-cloud-50">{bucket.name}</p>
                  <p className="text-sm text-cloud-300">Period: {formatPeriod(bucket.period)}</p>
                  <p className="text-sm text-cloud-300">
                    {formatCents(bucket.budgetAmount - bucket.remainingCents)} used of{' '}
                    {formatCents(bucket.budgetAmount)} · Remaining {formatCents(bucket.remainingCents)}
                  </p>
                </div>
                <span className="rounded-full border border-ink-700/70 bg-ink-800/70 px-2 py-1 text-xs font-semibold uppercase tracking-label text-cloud-200">
                  {bucket.period.toLowerCase()}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
