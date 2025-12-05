import type { JSX } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { PageHeader } from '@/components/ui/page-header';
import { MetricCard } from '@/components/ui/metric-card';
import { Panel } from '@/components/ui/panel';
import { EmptyState } from '@/components/ui/empty-state';
import { getCurrentUserId } from '@/lib/auth';
import { ROUTES } from '@/lib/routes';
import { DeleteBucketButton, AddBucketForm } from './client';
import { getBaseUrl } from '@/lib/base-url';

const hasText = (value?: string | null): value is string =>
  value !== undefined && value !== null && value !== '';

type Bucket = {
  id: string;
  name: string;
  period: 'WEEKLY' | 'MONTHLY';
  budgetAmount: number;
  postedSpendCents: number;
  pendingSpendCents: number;
  committedCents: number;
  remainingCents: number;
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
  if (hasText(cookieHeader)) {
    init.headers = { cookie: cookieHeader };
  }
  const res = await fetch(`${baseUrl}/api/buckets`, init);
  if (!res.ok) {
    const message = (await res.text()).trim();
    throw new Error(hasText(message) ? message : 'Failed to load buckets');
  }
  const data = (await res.json()) as Bucket[];
  return data;
}

export default async function BucketsPage(): Promise<JSX.Element | null> {
  try {
    await getCurrentUserId();
  } catch {
    redirect(`/signin?callbackUrl=${encodeURIComponent(ROUTES.dev.buckets)}`);
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
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader
        title="Buckets"
        label="Money (Real)"
          badge="Dev / Lab tool"
          description="Budgets that shape Cherry guardrails. Dev-only surface; advisory sandbox, not user-facing."
          actions={
            <div className="flex items-center gap-2">
              <ButtonLink href={ROUTES.dev.cards} variant="secondary" size="sm">
                Manage cards
              </ButtonLink>
              <ButtonLink href="/simulate" variant="ghost" size="sm" className="text-cherry-100">
                Run simulations
              </ButtonLink>
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
          tone="accent"
        />
      </section>

      <div className="grid gap-6 md:grid-cols-[2fr,1fr]">
        <Panel tone="muted" title="Your buckets" description="Budgets applied during engine evaluation.">
          {hasText(error) ? (
            <Alert variant="danger" title="Failed to load buckets." description={error} />
          ) : buckets.length === 0 ? (
            <EmptyState
              title="No buckets yet"
              description="Create budget envelopes to enforce weekly or monthly limits."
            />
          ) : (
            <ul className="space-y-3">
              {buckets.map((bucket) => (
                <Card key={bucket.id} tone="base" padding="md" className="border-ink-700/60">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-lg font-semibold text-cloud-50">{bucket.name}</p>
                      <p className="text-sm text-cloud-300">
                        {bucket.period} · {bucket.category} · {bucket.strictMode ? 'Strict' : 'Soft'}
                      </p>
                      <p className="text-sm text-cloud-300">
                        Remaining: {formatCents(bucket.remainingCents)} / {formatCents(bucket.budgetAmount)}
                      </p>
                    </div>
                    <DeleteBucketButton bucketId={bucket.id} />
                  </div>
                </Card>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          tone="muted"
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
