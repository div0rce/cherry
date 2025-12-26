import type { JSX } from 'react';
import { prisma } from '../../../../lib/prisma.js';
import { getCurrentUserIdOrRedirect } from '../../../../lib/auth.js';
import { ROUTES } from '../../../../lib/routes.js';
import { PageHeader } from '../../../../components/ui/page-header.js';
import { MetricCard } from '../../../../components/ui/metric-card.js';
import { Panel } from '../../../../components/ui/panel.js';
import { Card } from '../../../../components/ui/card.js';
import { EmptyState } from '../../../../components/ui/empty-state.js';
import { ErrorBanner } from '../../../../components/ErrorBanner.js';
import { asError } from '../../../../lib/errors.js';

type SourceSummary = {
  source: string;
  count: number;
  lastPostedAt: Date | null;
};

async function loadSourceSummaries(userId: string): Promise<SourceSummary[]> {
  const sources = await prisma.bankTransaction.groupBy({
    by: ['source'],
    where: { userId },
    _count: { _all: true },
    _max: { postedAt: true },
  });

  return sources.map((src) => ({
    source: src.source,
    count: src._count._all,
    lastPostedAt: src._max.postedAt ?? null,
  }));
}

export default async function IngestDashboardPage(): Promise<JSX.Element> {
  const userId = await getCurrentUserIdOrRedirect(ROUTES.dev.ingest);

  let summaries: SourceSummary[] = [];
  let error: string | null = null;
  try {
    summaries = await loadSourceSummaries(userId);
  } catch (err: unknown) {
    asError(err);
    error = err.message;
  }

  const totalTx = summaries.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        label="Ingest"
        badge="Dev / Data"
        title="Ingest state dashboard"
        description="See ingest sources, counts, and last posted times for this user across bank/Vine/CSV dev."
      />

      <section className="grid gap-3 md:grid-cols-3">
        <MetricCard label="Total transactions" value={totalTx} tone="accent" />
        <MetricCard label="Sources" value={summaries.length} helper="Bank, Vine, CSV dev, etc." />
        <MetricCard
          label="Most recent ingest"
          value={(() => {
            const recentDates = summaries
              .map((s) => s.lastPostedAt)
              .filter((d): d is Date => d instanceof Date)
              .sort((a, b) => b.getTime() - a.getTime());
            const latest = recentDates.length > 0 ? recentDates[0] : null;
            return latest ? latest.toLocaleString() : '—';
          })()}
        />
      </section>

      <Panel
        tone="muted"
        title="Ingest sources"
        description="Per-source counts and latest posted timestamps."
      >
        {error !== null ? (
          <ErrorBanner message={error} />
        ) : summaries.length === 0 ? (
          <EmptyState
            title="No ingest data yet"
            description="Run a bank/CSV/Vine ingest to populate this dashboard."
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {summaries.map((item) => (
              <Card key={item.source} tone="base" padding="md" className="border border-[rgba(27,38,69,0.6)]">
                <p className="text-sm font-semibold text-[#f8fafc]">{item.source}</p>
                <p className="text-sm text-[#c3cce5]">Transactions: {item.count}</p>
                <p className="text-sm text-[#c3cce5]">
                  Last posted:{' '}
                  {item.lastPostedAt ? item.lastPostedAt.toLocaleString() : 'No posted items'}
                </p>
              </Card>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
