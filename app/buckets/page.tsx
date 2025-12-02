import type { JSX } from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { MetricCard } from '@/components/ui/metric-card';
import { Panel } from '@/components/ui/panel';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorBanner } from '@/components/ErrorBanner';
import { getCurrentUserId } from '@/lib/auth';
import { DeleteBucketButton, AddBucketForm } from './client';
import { getBaseUrl } from '@/lib/base-url';


type Bucket = {
  id: string;
  name: string;
  period: 'WEEKLY' | 'MONTHLY';
  budgetAmount: number;
  currentAmount: number;
  strictMode: boolean;
  category: string;
  createdAt: string;
  updatedAt: string;
};

function formatCents(cents: number | null | undefined) {
  if (cents == null) return '—';
  return `$${(cents / 100).toFixed(2)}`;
}

async function fetchBuckets(): Promise<Bucket[]> {
  const baseUrl = getBaseUrl();
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join('; ');
  const init: RequestInit = {
    cache: 'no-store',
  };
  if (cookieHeader) {
    init.headers = { cookie: cookieHeader };
  }
  const res = await fetch(`${baseUrl}/api/buckets`, init);
  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || 'Failed to load buckets');
  }
  const data = (await res.json()) as Bucket[];
  return data;
}

export default async function BucketsPage(): Promise<JSX.Element | null> {
  try {
    await getCurrentUserId();
  } catch {
    redirect(`/signin?callbackUrl=${encodeURIComponent('/buckets')}`);
  }

  let buckets: Bucket[] = [];
  let error: string | null = null;

  try {
    buckets = await fetchBuckets();
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load buckets';
  }

  const totalBudgetCents = buckets.reduce((sum, b) => sum + (b.budgetAmount ?? 0), 0);
  const strictCount = buckets.filter((b) => b.strictMode).length;

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 text-slate-100">
      <PageHeader
        title="Buckets"
        description="Inspect and configure budgets Cherry uses to constrain and score decisions."
        label="Setup"
        actions={
          <div className="flex items-center gap-3 text-sm">
            <Link href="/cards" className="text-pink-200 hover:text-pink-100">
              Manage cards →
            </Link>
            <Link href="/simulate" className="text-pink-200 hover:text-pink-100">
              Run simulations →
            </Link>
          </div>
        }
      />

      <section className="grid gap-3 md:grid-cols-3">
        <MetricCard label="Total buckets" value={buckets.length} />
        <MetricCard label="Strict buckets" value={strictCount} helper="Hard stop when exceeded" />
        <MetricCard
          label="Total budget"
          value={formatCents(totalBudgetCents)}
          helper="All active buckets"
        />
      </section>

      <div className="grid gap-6 md:grid-cols-[2fr,1fr]">
        <Panel title="Your buckets" description="Budgets applied during engine evaluation.">
          {error ? (
            <ErrorBanner message="Failed to load buckets." />
          ) : buckets.length === 0 ? (
            <EmptyState
              title="No buckets yet"
              description="Create budget envelopes to enforce weekly or monthly limits."
            />
          ) : (
            <ul className="divide-y divide-white/5">
              {buckets.map((bucket) => (
                <li key={bucket.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-white">{bucket.name}</p>
                      <p className="text-sm text-slate-300">
                        {bucket.period} · {bucket.category} · {bucket.strictMode ? 'Strict' : 'Soft'}
                      </p>
                      <p className="text-sm text-slate-400">
                        Remaining: {formatCents(bucket.currentAmount)} / {formatCents(bucket.budgetAmount)}
                      </p>
                    </div>
                    <DeleteBucketButton bucketId={bucket.id} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Create bucket"
          description="Amounts are dollars in the UI and sent as cents to the API."
          padded
        >
          <AddBucketForm />
        </Panel>
      </div>
    </div>
  );
}
