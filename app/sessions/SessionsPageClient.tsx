'use client';

import { useMemo, useState, type JSX } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { MetricCard } from '@/components/ui/metric-card';
import { Panel } from '@/components/ui/panel';
import { EmptyState } from '@/components/ui/empty-state';
import type { SessionSummary } from '@/lib/sessions/summaries';

const hasText = (value?: string | null): value is string =>
  value !== undefined && value !== null && value !== '';

type Props = {
  initialSummaries: SessionSummary[];
  initialStatus: 'all' | 'active' | 'expired' | 'confirmed';
};

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

function formatCents(amount: number | null | undefined) {
  if (amount == null) return '—';
  return `$${(amount / 100).toFixed(2)}`;
}

export function SessionsPageClient({ initialSummaries, initialStatus }: Props): JSX.Element {
  const [status, setStatus] = useState<Props['initialStatus']>(initialStatus);

  const counts = useMemo(() => {
    const open = initialSummaries.filter((s) => s.displayStatus === 'OPEN').length;
    const confirmed = initialSummaries.filter(
      (s) => s.displayStatus === 'CONFIRMED_PENDING' || s.displayStatus === 'CONFIRMED_POSTED'
    ).length;
    const expired = initialSummaries.filter((s) => s.displayStatus === 'EXPIRED').length;
    return { total: initialSummaries.length, open, confirmed, expired };
  }, [initialSummaries]);

  const filtered = useMemo(() => {
    if (status === 'all') return initialSummaries;
    if (status === 'active') return initialSummaries.filter((s) => s.displayStatus === 'OPEN');
    if (status === 'expired') return initialSummaries.filter((s) => s.displayStatus === 'EXPIRED');
    if (status === 'confirmed')
      return initialSummaries.filter(
        (s) => s.displayStatus === 'CONFIRMED_PENDING' || s.displayStatus === 'CONFIRMED_POSTED'
      );
    return initialSummaries;
  }, [initialSummaries, status]);

  const statusSelect = (
    <label className="flex items-center gap-2 text-sm text-slate-300">
      <span className="text-xs uppercase tracking-label text-slate-500">Status</span>
      <select
        name="status"
        value={status}
        onChange={(e) => setStatus(e.target.value as Props['initialStatus'])}
        className="rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-300"
      >
        <option value="all">All</option>
        <option value="active">Open</option>
        <option value="confirmed">Confirmed</option>
        <option value="expired">Expired</option>
      </select>
    </label>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-8 text-slate-100">
      <PageHeader
        label="Engine"
        title="Sessions"
        description="Timeline of engine decisions, scans, and user overrides."
        actions={
          <>
            {statusSelect}
            <Link
              href="/activity"
              className="rounded-lg border border-pink-500/30 bg-pink-500/10 px-3 py-2 text-sm font-semibold text-pink-100 hover:border-pink-400/50 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-300"
            >
              Activity
            </Link>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Sessions (last 50)" value={counts.total} helper="Most recent first" />
        <MetricCard label="Open" value={counts.open} helper="Waiting for confirm" />
        <MetricCard label="Confirmed" value={counts.confirmed} helper="Pending or posted" />
        <MetricCard label="Expired" value={counts.expired} helper="Session timed out" />
      </div>

      <Panel
        title="Session timeline"
        description="Latest sessions across scan/manual, simulate, and Vine. Confirmations drive Cherry Points."
        actions={
          <Link
            href="/scan"
            className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-100 hover:border-pink-500/30 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-300"
          >
            Run a scan
          </Link>
        }
      >
        {filtered.length === 0 ? (
          <EmptyState
            title="No sessions yet"
            description="Run a scan or simulate a swipe to create a recommendation session."
            actionLabel="Start with scan"
            actionHref="/scan"
          />
        ) : (
          <ul className="space-y-3">
            {filtered.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/sessions/${s.id}`}
                  className="block rounded-2xl border border-white/5 bg-slate-950/60 p-4 shadow-lg transition hover:border-pink-500/30 hover:bg-slate-900/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-300"
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
                        {new Date(s.createdAt).toLocaleString()} · {s.category} ·{' '}
                        {formatCents(s.amountCents)}
                      </p>
                      {hasText(s.bucketName) ? (
                        <p className="text-xs text-slate-400">Bucket: {s.bucketName}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-end gap-1 text-sm text-slate-200">
                      <div className="flex items-center gap-2">
                        <span className="text-xs uppercase tracking-wide text-slate-400">Points</span>
                        <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-100">
                          {s.pointsPosted} posted
                        </span>
                        {s.pointsPending > 0 ? (
                          <span className="rounded-full bg-blue-500/10 px-3 py-1 text-blue-100">
                            {s.pointsPending} pending
                          </span>
                        ) : null}
                        {s.pointsPosted === 0 && s.pointsPending === 0 ? (
                          <span className="text-xs text-slate-400">Offered: {s.pointsOffered}</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
