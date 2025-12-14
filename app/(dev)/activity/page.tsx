import type { JSX } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { MetricCard } from '@/components/ui/metric-card';
import { Panel } from '@/components/ui/panel';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Card } from '@/components/ui/card';
import { ButtonLink } from '@/components/ui/Button';
import { getCurrentUserIdOrRedirect } from '@/lib/auth';
import { fetchActivityFeed } from '@/lib/activity/feed';

const hasText = (value?: string | null): value is string =>
  value !== undefined && value !== null && value !== '';

const isValidNumber = (value?: number | null): value is number =>
  value !== undefined && value !== null && !Number.isNaN(value);

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
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader
          label="Engine"
          badge="Dev / Lab Tool"
          title="Engine activity"
          description="Timeline of engine-driven events: scans/sessions, confirmations, and ledger updates."
          actions={
            <ButtonLink href="/sessions" variant="secondary" size="sm">
              View sessions
            </ButtonLink>
          }
        />

        <section className="grid gap-3 md:grid-cols-3">
          <MetricCard label="Events" value={items.length} helper="Last 100" />
          <MetricCard label="Session events" value={sessionEvents} helper="Creations" />
          <MetricCard label="Ledger events" value={ledgerEvents} helper="Posted/Revoked" />
        </section>

        <Panel tone="muted" title="Recent activity" description="Latest engine and ledger events.">
          {hasText(error) ? (
            <ErrorBanner message="Failed to load activity." />
          ) : hasRows ? (
            <div className="grid gap-3 md:grid-cols-2">
              {items.map((item) => (
                <Card
                  key={`${item.type}-${item.sessionId ?? ''}-${item.occurredAt.toISOString()}-${item.points ?? ''}`}
                  tone="base"
                  padding="md"
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[#c3cce5]">
                      <span className="rounded-full border border-[rgba(27,38,69,0.6)] bg-[rgba(17,26,47,0.7)] px-2 py-1">
                        {item.type.replace(/_/g, ' ')}
                      </span>
                      {hasText(item.sessionId) ? (
                        <ButtonLink href={`/sessions/${item.sessionId}`} variant="ghost" size="sm">
                          Session
                        </ButtonLink>
                      ) : null}
                    </div>
                    <span className="text-xs text-[#a5b0d0]">
                      {new Date(item.occurredAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm text-[#f8fafc]">
                    {item.type === 'SESSION_CREATED' && (
                      <p>
                        {item.merchantName ?? 'Manual scan'} · {item.category} ·{' '}
                        {item.amountCents != null ? `$${(item.amountCents / 100).toFixed(2)}` : '—'}
                      </p>
                    )}
                    {item.type === 'SESSION_CONFIRMED' && (
                      <p>Session confirmed · {isValidNumber(item.points) ? formatPoints(item.points) : ''}</p>
                    )}
                    {item.type === 'LEDGER_POSTED' && <p>Points posted · {formatPoints(item.points)}</p>}
                    {item.type === 'LEDGER_REVOKED' && <p>Points revoked · {formatPoints(item.points)}</p>}
                    {hasText(item.verdict) ? (
                      <p className="text-xs text-[#a5b0d0]">Verdict: {item.verdict}</p>
                    ) : null}
                  </div>
                </Card>
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
