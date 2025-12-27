import type { JSX } from 'react';
import { redirect } from 'next/navigation';
import { ButtonLink } from '../../../../components/ui/Button';
import { Card } from '../../../../components/ui/card';
import { Alert } from '../../../../components/ui/alert';
import { PageHeader } from '../../../../components/ui/page-header';
import { MetricCard } from '../../../../components/ui/metric-card';
import { Panel } from '../../../../components/ui/panel';
import { EmptyState } from '../../../../components/ui/empty-state';
import { getCurrentUserId } from '../../../../lib/auth';
import { ROUTES } from '../../../../lib/routes';
import { DeleteBucketButton, AddBucketForm } from './client';
import { fetchApiResult } from '../../../../lib/api/fetch-json';
import type { ApiResult } from '../../../../lib/api/result';

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

async function fetchBuckets(): Promise<ApiResult<Bucket[]>> {
  return fetchApiResult<Bucket[]>('/api/buckets', { cache: 'no-store' });
}

export default async function BucketsPage(): Promise<JSX.Element | null> {
  try {
    await getCurrentUserId();
  } catch (error: unknown) {
    void error;
    redirect(`/signin?callbackUrl=${encodeURIComponent(ROUTES.dev.buckets)}`);
  }

  let buckets: Bucket[] = [];
  let error: string | null = null;

  const bucketsResult = await fetchBuckets();
  if (!bucketsResult.ok) {
    if (bucketsResult.error === 'UNAUTHORIZED') {
      redirect(`/signin?callbackUrl=${encodeURIComponent(ROUTES.dev.buckets)}`);
    }
    error = bucketsResult.message;
  } else {
    buckets = bucketsResult.data;
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
              <ButtonLink href="/simulate" variant="ghost" size="sm" className="text-[#ffe6ee]">
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
                <Card key={bucket.id} tone="base" padding="md" className="border-[rgba(27,38,69,0.6)]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-lg font-semibold text-[#f8fafc]">{bucket.name}</p>
                      <p className="text-sm text-[#c3cce5]">
                        {bucket.period} · {bucket.category} · {bucket.strictMode ? 'Strict' : 'Soft'}
                      </p>
                      <p className="text-sm text-[#c3cce5]">
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
