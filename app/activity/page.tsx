import type { JSX } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { MetricCard } from '@/components/ui/metric-card';
import { Panel } from '@/components/ui/panel';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorBanner } from '@/components/ErrorBanner';
import { getCurrentUserIdOrRedirect } from '@/lib/auth';
import { fetchActivityFeed } from '@/lib/activity/feed';

function formatPoints(points: number | undefined | null): string {
  return `${points ?? 0} pts`;
}

export default async function ActivityPage(): Promise<JSX.Element> {
  const userId = await getCurrentUserIdOrRedirect('/activity');
  let error: string | null = null;
  let feed = null;
  try {
    feed = await fetchActivityFeed(userId, { limit: 100 });
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load activity';
  }

  const items = feed?.items ?? [];
  const hasRows = items.length > 0;
  const sessionEvents = items.filter((item) => item.type === 'SESSION_CREATED').length;
  const ledgerEvents = items.filter(
    (item) => item.type === 'LEDGER_POSTED' || item.type === 'LEDGER_REVOKED'
  ).length;

  return (
    <main className="flex-1 overflow-y-auto px-4 py-8 md:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader
          label="Engine"
          title="Engine activity"
          description="Timeline of engine-driven events: scans/sessions, confirmations, and ledger updates."
          actions={
            <Link
              href="/sessions"
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 hover:border-pink-500/30 hover:text-white"
            >
              View sessions
            </Link>
          }
        />

        <section className="grid gap-3 md:grid-cols-3">
          <MetricCard label="Events" value={items.length} helper="Last 100" />
          <MetricCard label="Session events" value={sessionEvents} helper="Creations" />
          <MetricCard label="Ledger events" value={ledgerEvents} helper="Posted/Revoked" />
        </section>

        <Panel title="Recent activity" description="Latest engine and ledger events.">
          {error ? (
            <ErrorBanner message="Failed to load activity." />
          ) : hasRows ? (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={`${item.type}-${item.sessionId ?? ''}-${item.occurredAt.toISOString()}-${item.points ?? ''}`}
                  className="rounded-2xl border border-white/5 bg-slate-950/60 p-4 shadow hover:border-pink-500/30"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-pink-200">
                        <span>{item.type.replace(/_/g, ' ')}</span>
                        {item.sessionId && (
                          <Link
                            href={`/sessions/${item.sessionId}`}
                            className="rounded-full bg-white/10 px-2 py-1 text-[11px] font-semibold text-slate-100"
                          >
                            Session
                          </Link>
                        )}
                      </div>
                      <p className="text-sm text-slate-200">
                        {item.type === 'SESSION_CREATED' && (
                          <>
                            {item.merchantName ?? 'Manual scan'} · {item.category} ·{' '}
                            {item.amountCents != null ? `$${(item.amountCents / 100).toFixed(2)}` : '—'}
                          </>
                        )}
                        {item.type === 'SESSION_CONFIRMED' && (
                          <>Session confirmed · {item.points ? formatPoints(item.points) : ''}</>
                        )}
                        {item.type === 'LEDGER_POSTED' && <>Points posted · {formatPoints(item.points)}</>}
                        {item.type === 'LEDGER_REVOKED' && (
                          <>Points revoked · {formatPoints(item.points)}</>
                        )}
                      </p>
                      {item.verdict && (
                        <p className="text-xs text-slate-400">Verdict: {item.verdict}</p>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">
                      {new Date(item.occurredAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No activity yet"
              description="Create a session from the Scan page or run a simulation to see events show up here."
            />
          )}
        </Panel>
      </div>
    </main>
  );
}
