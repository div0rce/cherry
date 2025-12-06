'use client';

import type { FormEvent, JSX } from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/page-header';
import { Select } from '@/components/ui/Select';
import { Toggle } from '@/components/ui/Toggle';
import type { BucketRuntime } from '@/lib/buckets-runtime';

type SerializableBucket = Omit<
  BucketRuntime,
  'createdAt' | 'updatedAt' | 'periodStart' | 'periodEnd'
> & {
  createdAt: string | Date;
  updatedAt: string | Date;
  periodStart: string | Date;
  periodEnd: string | Date;
};

const rewardCategoryOptions = [
  { value: 'DINING', label: 'Dining' },
  { value: 'GROCERIES', label: 'Groceries' },
  { value: 'GAS', label: 'Gas' },
  { value: 'TRAVEL', label: 'Travel' },
  { value: 'AIR_TRAVEL', label: 'Air travel' },
  { value: 'HOTEL', label: 'Hotel' },
  { value: 'CAR_RENTAL', label: 'Car rental' },
  { value: 'ONLINE_SHOPPING', label: 'Online shopping' },
  { value: 'ENTERTAINMENT', label: 'Entertainment' },
  { value: 'HEALTH', label: 'Health' },
  { value: 'UTILITIES', label: 'Utilities' },
  { value: 'GENERAL_MERCHANDISE', label: 'General merchandise' },
  { value: 'OTHER', label: 'Other' },
];

const periodOptions = [
  { value: 'MONTHLY', label: 'Monthly (default)' },
  { value: 'WEEKLY', label: 'Weekly' },
];

const hasText = (value?: string | null): value is string =>
  value !== undefined && value !== null && value.trim() !== '';

function formatCents(cents: number | null | undefined): string {
  if (typeof cents !== 'number' || Number.isNaN(cents)) return '—';
  return `$${(cents / 100).toFixed(2)}`;
}

function formatPeriod(period: BucketRuntime['period']): string {
  return period === 'WEEKLY' ? 'Weekly' : 'Monthly';
}

function normalizeBucket(bucket: SerializableBucket): BucketRuntime {
  return {
    ...bucket,
    createdAt: new Date(bucket.createdAt),
    updatedAt: new Date(bucket.updatedAt),
    periodStart: new Date(bucket.periodStart),
    periodEnd: new Date(bucket.periodEnd),
  };
}

type BucketsClientProps = {
  initialBuckets: BucketRuntime[];
  initialError: string | null;
};

export function BucketsClient({
  initialBuckets,
  initialError,
}: BucketsClientProps): JSX.Element {
  const [buckets, setBuckets] = useState<BucketRuntime[]>(
    initialBuckets.map((bucket) => normalizeBucket(bucket))
  );
  const [error, setError] = useState<string | null>(initialError);
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState('');
  const [budgetDollars, setBudgetDollars] = useState('');
  const [period, setPeriod] = useState<BucketRuntime['period']>('MONTHLY');
  const [category, setCategory] = useState<string>('GENERAL_MERCHANDISE');
  const [strictMode, setStrictMode] = useState(true);

  const hasBuckets = buckets.length > 0;

  function resetForm(): void {
    setName('');
    setBudgetDollars('');
    setPeriod('MONTHLY');
    setCategory('GENERAL_MERCHANDISE');
    setStrictMode(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setStatus(null);

    const nameTrimmed = name.trim();
    const dollars = Number.parseFloat(budgetDollars);

    if (!hasText(nameTrimmed)) {
      setError('Bucket name is required.');
      return;
    }

    if (!Number.isFinite(dollars) || dollars <= 0) {
      setError('Set a positive budget amount in USD.');
      return;
    }

    const budgetAmountCents = Math.round(dollars * 100);

    setIsSubmitting(true);
    setStatus('Saving your bucket…');

    try {
      const response = await fetch('/api/buckets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameTrimmed,
          period,
          budgetAmountCents,
          category,
          strictMode,
        }),
      });

      if (response.status === 401) {
        setError('Your session expired. Please sign in again.');
        setStatus(null);
        return;
      }

      if (!response.ok) {
        const message = (await response.text()).trim();
        setError(hasText(message) ? message : 'Failed to save bucket.');
        setStatus(null);
        return;
      }

      const created = normalizeBucket(await response.json());
      setBuckets((prev) => [created, ...prev]);
      resetForm();
      setStatus('Bucket added. Cherry will factor it into recommendations.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error while saving your bucket.';
      setError(message);
      setStatus(null);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 space-y-6">
      <PageHeader
        title="Buckets"
        description="Buckets show how your money is divided. Cherry observes and advises; it never processes payments."
        actions={
          <Button variant="secondary" onClick={() => setShowForm((prev) => !prev)}>
            {showForm ? 'Close' : '+ Bucket'}
          </Button>
        }
      />

      <ErrorBanner message={error} />

      {showForm ? (
        <Card tone="base" padding="lg" className="border border-ink-700/60 shadow-sm">
          <div className="flex flex-col gap-2">
            <div>
              <p className="text-lg font-semibold text-cloud-50">Add a bucket</p>
              <p className="text-sm text-cloud-300">
                Buckets protect your runway and rewards. Advisory only—no payment routing or processing.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-3 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1 text-sm text-cloud-200">
                  <span className="font-medium">Name</span>
                  <Input
                    name="name"
                    placeholder="Essentials, Fun, Travel"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                  />
                </label>
                <label className="space-y-1 text-sm text-cloud-200">
                  <span className="font-medium">Budget (USD)</span>
                  <Input
                    name="budget"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="500.00"
                    value={budgetDollars}
                    onChange={(event) => setBudgetDollars(event.target.value)}
                    required
                  />
                  <p className="text-xs text-cloud-400">Cherry stores cents and derives remaining/committed for safety.</p>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1 text-sm text-cloud-200">
                  <span className="font-medium">Period</span>
                  <Select
                    name="period"
                    value={period}
                    onChange={(event) => setPeriod(event.target.value as BucketRuntime['period'])}
                    required
                    className="bg-cherry-bg"
                  >
                    {periodOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="space-y-1 text-sm text-cloud-200">
                  <span className="font-medium">Primary category</span>
                  <Select
                    name="category"
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    required
                    className="bg-cherry-bg"
                  >
                    {rewardCategoryOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                  <p className="text-xs text-cloud-400">
                    Category uses the RewardCategory enum; Cherry keeps validation advisory-only.
                  </p>
                </label>
              </div>

              <div className="flex items-center justify-between rounded-md border border-ink-700/60 bg-ink-800/60 px-3 py-2">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-cloud-100">Strict mode</p>
                  <p className="text-xs text-cloud-300">
                    Keep this bucket protective in recommendations. Cherry still only advises; no payment routing happens here.
                  </p>
                </div>
                <Toggle
                  label={strictMode ? 'On' : 'Off'}
                  checked={strictMode}
                  onCheckedChange={(checked) => setStrictMode(Boolean(checked))}
                  aria-label="Toggle strict mode for this bucket"
                />
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-cloud-400">
                  Cherry uses the budget and category to advise only. It never fronts transactions or changes your bank.
                </p>
                <Button type="submit" disabled={isSubmitting} variant="primary">
                  {isSubmitting ? 'Saving…' : 'Save bucket'}
                </Button>
              </div>
              {hasText(status) ? <p className="text-xs text-cloud-300">{status}</p> : null}
            </form>
          </div>
        </Card>
      ) : null}

      {hasBuckets ? (
        <div className="space-y-3">
          {buckets.map((bucket) => (
            <Card key={bucket.id} tone="base" padding="md" className="border border-ink-700/60">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-lg font-semibold text-cloud-50">{bucket.name}</p>
                  <p className="text-sm text-cloud-300">Period: {formatPeriod(bucket.period)}</p>
                  <p className="text-sm text-cloud-300">
                    {formatCents(bucket.committedCents)} used of {formatCents(bucket.budgetAmount)} · Remaining{' '}
                    {formatCents(bucket.remainingCents)}
                  </p>
                  <p className="text-xs text-cloud-400">
                    Category: {bucket.category} · Strict mode {bucket.strictMode ? 'on' : 'off'}
                  </p>
                </div>
                <span className="rounded-full border border-ink-700/70 bg-ink-800/70 px-2 py-1 text-xs font-semibold uppercase tracking-label text-cloud-200">
                  {bucket.period.toLowerCase()}
                </span>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No buckets yet"
          description="Create a few envelopes (e.g., Essentials, Fun) so Cherry can protect your runway."
          actionLabel="Add a bucket"
          onAction={() => setShowForm(true)}
        />
      )}
    </div>
  );
}
