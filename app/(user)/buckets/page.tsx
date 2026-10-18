import type { JSX } from 'react';
import Link from 'next/link';
import type { BucketRuntime } from '../../../lib/buckets-runtime.js';
import { formatCents } from '../../../lib/ui/money.js';
import { fetchFromApi, requireUserContext } from '../_lib/api.js';
import { LoadError } from '../_components/LoadError.js';
export const dynamic = 'force-dynamic';

export default async function BucketsPage(): Promise<JSX.Element> {
  await requireUserContext('/buckets');
  const result = await fetchFromApi<BucketRuntime[]>('/api/buckets');

  return (
    <div className="space-y-4 pb-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Buckets</p>
          <h1 className="text-2xl font-semibold text-[#0F172A]">Your buckets</h1>
          <p className="text-sm text-slate-600">
            Spending limits Cherry checks a purchase against. Cherry only reads these; it never moves money.
          </p>
        </div>
        <Link
          href="/app/onboarding/buckets/new"
          className="rounded-full bg-[#0F172A] px-4 py-2 text-sm font-medium text-white"
        >
          Add a bucket
        </Link>
      </header>

      {!result.ok ? (
        <LoadError what="buckets" retryHref="/buckets" />
      ) : result.data.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
          <p className="font-semibold text-[#0F172A]">No buckets yet</p>
          <p className="mt-1">
            A bucket is a monthly or weekly limit for a category, like $300 for dining. Add one so
            recommendations can warn you before a purchase goes over it.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {result.data.map((bucket) => (
            <li key={bucket.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-[#0F172A]">{bucket.name}</p>
                  <p className="text-xs text-slate-500">
                    {bucket.period.toLowerCase()} · {bucket.category.toLowerCase().replace(/_/g, ' ')}
                  </p>
                </div>
                <Link
                  href={`/app/onboarding/buckets/${bucket.id}/edit`}
                  className="text-sm font-semibold text-[#A01029] hover:underline"
                  aria-label={`Edit ${bucket.name}`}
                >
                  Edit
                </Link>
              </div>
              <p className="mt-3 text-sm text-slate-700">
                {formatCents(bucket.remainingCents)} left of {formatCents(bucket.limitCents)}
                {bucket.pendingSpendCents > 0 ? ` (${formatCents(bucket.pendingSpendCents)} pending)` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
