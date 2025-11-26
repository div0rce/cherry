import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
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
  const cookieHeader = cookieStore.toString();
  const res = await fetch(`${baseUrl}/api/buckets`, {
    cache: 'no-store',
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });
  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || 'Failed to load buckets');
  }
  return res.json();
}

export default async function BucketsPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent('/buckets')}`);
  }

  let buckets: Bucket[] = [];
  let error: string | null = null;

  try {
    buckets = await fetchBuckets();
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load buckets';
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Cherry Lab</p>
        <h1 className="text-3xl font-semibold">Buckets</h1>
        <p className="text-slate-500">
          Manage budget envelopes. Values are stored in cents; shown here in dollars.
        </p>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/cards" className="text-blue-600 hover:text-blue-700">
            Manage cards →
          </Link>
          <Link href="/simulate" className="text-blue-600 hover:text-blue-700">
            Run simulations →
          </Link>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-[2fr,1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white/60 shadow-sm backdrop-blur">
          <div className="border-b border-slate-200 px-4 py-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Your buckets</h2>
          </div>

          {error ? (
            <div className="p-4 text-sm text-red-600">{error}</div>
          ) : buckets.length === 0 ? (
            <div className="p-4 text-sm text-slate-500">No buckets yet. Add one on the right.</div>
          ) : (
            <ul className="divide-y divide-slate-200">
              {buckets.map((bucket) => (
                <li key={bucket.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold">{bucket.name}</p>
                      <p className="text-sm text-slate-500">
                        {bucket.period} · {bucket.category} · {bucket.strictMode ? 'Strict' : 'Soft'}
                      </p>
                      <p className="text-sm text-slate-500">
                        Remaining: {formatCents(bucket.currentAmount)} / {formatCents(bucket.budgetAmount)}
                      </p>
                    </div>
                    <DeleteBucketButton bucketId={bucket.id} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white/60 shadow-sm backdrop-blur p-4 space-y-3">
          <h3 className="text-base font-semibold">Create bucket</h3>
          <p className="text-sm text-slate-500">
            Amounts are dollars in the UI and sent as cents to the API.
          </p>
          <AddBucketForm />
        </section>
      </div>
    </div>
  );
}
