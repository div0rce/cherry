import type { JSX } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUserId } from '@/lib/auth';
import { fetchSessionSummaries } from '@/lib/sessions/summaries';

function formatCents(amount: number | null | undefined) {
  if (amount == null) return '—';
  return `$${(amount / 100).toFixed(2)}`;
}

const statusClasses: Record<string, string> = {
  OPEN: 'bg-amber-500/15 text-amber-100',
  EXPIRED: 'bg-slate-500/20 text-slate-200',
  CONFIRMED_PENDING: 'bg-blue-500/20 text-blue-100',
  CONFIRMED_POSTED: 'bg-emerald-500/20 text-emerald-100',
};

const verdictClasses: Record<string, string> = {
  HEALTHY: 'bg-emerald-500/15 text-emerald-100',
  BORDERLINE: 'bg-amber-500/15 text-amber-100',
  BREAKS_BUDGET: 'bg-rose-600/15 text-rose-100',
};

export default async function SessionsPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}): Promise<JSX.Element | null> {
  let userId: string;
  try {
    userId = await getCurrentUserId();
  } catch {
    redirect(`/signin?callbackUrl=${encodeURIComponent('/sessions')}`);
    return null;
  }

  const params = searchParams ?? {};
  const rawStatus = typeof params['status'] === 'string' ? params['status'] : undefined;
  const statusParam = rawStatus ?? 'all';
  const { items } = await fetchSessionSummaries(userId, {
    status: statusParam as 'all' | 'active' | 'expired' | 'confirmed',
    limit: 50,
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-6 text-slate-100">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-label text-pink-200">Sessions</p>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <h1 className="text-3xl font-semibold text-white">Recommendation sessions</h1>
          <div className="flex items-center gap-3 text-sm text-slate-300">
            <span>Status</span>
            <form>
              <select
                name="status"
                defaultValue={statusParam ?? 'all'}
                className="rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none"
                onChange={(e) => e.currentTarget.form?.submit()}
              >
                <option value="all">All</option>
                <option value="active">Open</option>
                <option value="confirmed">Confirmed</option>
                <option value="expired">Expired</option>
              </select>
            </form>
            <Link
              href="/activity"
              className="rounded-lg border border-pink-500/30 bg-pink-500/10 px-3 py-2 text-pink-100"
            >
              View activity
            </Link>
          </div>
        </div>
        <p className="text-slate-300">
          Latest sessions across scans and Vine. Confirmed sessions earn Cherry Points.
        </p>
      </header>

      <div className="space-y-3">
        {items.map((s) => (
          <Link
            key={s.id}
            href={`/sessions/${s.id}`}
            className="block rounded-2xl border border-white/5 bg-slate-950/60 p-4 shadow-lg transition hover:border-pink-500/30 hover:bg-slate-900/60"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-lg font-semibold text-white">
                    {s.merchantName ?? 'Manual scan'}
                  </p>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${verdictClasses[s.verdict] ?? 'bg-white/10 text-slate-100'}`}
                  >
                    {s.verdict}
                  </span>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClasses[s.displayStatus] ?? 'bg-white/10 text-slate-100'}`}
                  >
                    {s.displayStatus}
                  </span>
                </div>
                <p className="text-sm text-slate-300">
                  {new Date(s.createdAt).toLocaleString()} · {s.category} · {formatCents(s.amountCents)}
                </p>
                {s.bucketName && (
                  <p className="text-xs text-slate-400">Bucket: {s.bucketName}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 text-sm text-slate-200">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wide text-slate-400">Points</span>
                  <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-100">
                    {s.pointsPosted} posted
                  </span>
                  {s.pointsPending > 0 && (
                    <span className="rounded-full bg-blue-500/10 px-3 py-1 text-blue-100">
                      {s.pointsPending} pending
                    </span>
                  )}
                  {s.pointsPosted === 0 && s.pointsPending === 0 && (
                    <span className="text-xs text-slate-400">Offered: {s.pointsOffered}</span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        ))}

        {items.length === 0 && (
          <div className="rounded-2xl border border-white/5 bg-white/5 p-6 text-center text-slate-400">
            No sessions yet. Try the scan flow to create one.
          </div>
        )}
      </div>
    </div>
  );
}
