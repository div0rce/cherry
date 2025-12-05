import type { JSX } from 'react';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { MetricCard } from '@/components/ui/metric-card';
import { Panel } from '@/components/ui/panel';
import { EmptyState } from '@/components/ui/empty-state';
import { getCurrentUserIdOrRedirect } from '@/lib/auth';
import { getDashboardStats } from '@/lib/dashboard';
import { ROUTES } from '@/lib/routes';

const hasText = (value?: string | null): value is string =>
  value !== undefined && value !== null && value !== '';

function formatMoney(amountCents: number | null | undefined, currency = 'USD'): string {
  if (amountCents == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amountCents / 100);
}

function formatTimestamp(date: Date): string {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  return isToday ? `Today ${formatter.format(date)}` : formatter.format(date);
}

function DevShortcut({ href, title, description }: { href: string; title: string; description: string }): JSX.Element {
  return (
    <Card
      tone="muted"
      padding="md"
      className="flex flex-col gap-2 transition hover:-translate-y-0.5 hover:border-cherry-500/50"
    >
      <p className="text-[11px] uppercase tracking-label text-cloud-300">Dev tool</p>
      <p className="text-base font-semibold text-cloud-50">{title}</p>
      <p className="text-sm text-cloud-300">{description}</p>
      <div className="pt-1">
        <ButtonLink
          href={href}
          variant="ghost"
          size="sm"
          className="px-0 text-cherry-100 hover:text-cloud-50"
        >
          Open →
        </ButtonLink>
      </div>
    </Card>
  );
}

export default async function DashboardPage(): Promise<JSX.Element> {
  const userId = await getCurrentUserIdOrRedirect();
  const stats = await getDashboardStats(userId);

  const totalBuckets =
    stats.bucketHealth.onTrack + stats.bucketHealth.atRisk + stats.bucketHealth.overLimit;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader
        label="Money (Real)"
        badge="Dev / Lab tool"
        title="Dev dashboard"
        description="Single view across spend inputs, engine traces, and dev tools. Advisory-only; not user-facing."
        actions={
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/scan" variant="secondary" size="md">
              Scan
            </ButtonLink>
            <ButtonLink href="/simulate" variant="primary" size="md">
              Simulate
            </ButtonLink>
            <ButtonLink href={ROUTES.dev.cards} variant="ghost" size="md" className="text-cherry-100">
              Cards
            </ButtonLink>
          </div>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Lifetime Cherry Points"
          value={stats.lifetimePoints}
          helper={`+${stats.monthPoints} this month`}
          tone="positive"
        />
        <MetricCard label="Cards" value={stats.cardCount} helper="Configured for engine use" tone="accent" />
        <MetricCard label="Buckets" value={stats.bucketCount} helper="Budgets tracked" />
        <MetricCard
          label="Simulations (month)"
          value={stats.simulatedTxCountMonth}
          helper={`${stats.realTxCountMonth} real tx in same period`}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <Panel
          tone="muted"
          title="Buckets health"
          description="Real-time budget state that the engine enforces during Observe → Evaluate."
        >
          <div className="grid grid-cols-3 gap-3 text-sm">
            <Card tone="muted" padding="sm" className="border-ink-700/60">
              <p className="text-[11px] uppercase tracking-label text-cloud-300">On track</p>
              <p className="mt-1 text-xl font-semibold text-mint-200">{stats.bucketHealth.onTrack}</p>
            </Card>
            <Card tone="muted" padding="sm" className="border-ink-700/60">
              <p className="text-[11px] uppercase tracking-label text-cloud-300">At risk</p>
              <p className="mt-1 text-xl font-semibold text-amber-200">{stats.bucketHealth.atRisk}</p>
            </Card>
            <Card tone="muted" padding="sm" className="border-ink-700/60">
              <p className="text-[11px] uppercase tracking-label text-cloud-300">Over limit</p>
              <p className="mt-1 text-xl font-semibold text-rose-200">{stats.bucketHealth.overLimit}</p>
            </Card>
          </div>
          <p className="text-sm text-cloud-300">
            {totalBuckets === 0
              ? 'No buckets configured yet. Create buckets to enforce weekly/monthly budgets.'
              : stats.bucketHealth.overLimit > 0 || stats.bucketHealth.atRisk > 0
                ? `${stats.bucketHealth.atRisk} at risk, ${stats.bucketHealth.overLimit} over limit. Inspect on the Buckets page.`
                : 'All active buckets are currently within budget.'}
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <ButtonLink href={ROUTES.dev.buckets} variant="secondary" size="sm">
              Manage buckets
            </ButtonLink>
            <ButtonLink href={ROUTES.dev.cards} variant="ghost" size="sm" className="text-cloud-200">
              Manage cards
            </ButtonLink>
          </div>
        </Panel>

        <Panel
          tone="muted"
          title="Recent activity"
          description="What the engine has seen lately: real swipes, simulations, points events."
          actions={
          <ButtonLink href={ROUTES.dev.activity} variant="ghost" size="sm" className="text-cherry-100">
            View all →
          </ButtonLink>
          }
        >
          {stats.recentUnifiedActivity.length === 0 ? (
            <EmptyState
              title="No activity yet"
              description="Run a simulation, scan, or Vine event to populate the timeline."
              actionLabel="Run a simulation"
              actionHref="/simulate"
            />
          ) : (
            <ul className="space-y-2 text-sm text-cloud-50">
              {stats.recentUnifiedActivity.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-ink-800/60 bg-ink-900/60 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate">
                      {item.label}
                      {item.amountCents != null && (
                        <span className="ml-1 text-cloud-300">
                          · {formatMoney(item.amountCents, item.currency ?? 'USD')}
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-cloud-400">
                      {formatTimestamp(item.occurredAt)}
                    </p>
                  </div>
                  <span className="ml-3 inline-flex items-center rounded-full border border-ink-700/60 bg-ink-800/70 px-2 py-0.5 text-xs text-cloud-200">
                    {item.kind === 'REAL_TRANSACTION'
                      ? 'Real'
                      : item.kind === 'SIMULATED_TRANSACTION'
                        ? 'Sim'
                        : item.kind === 'POINTS_EVENT'
                          ? 'Points'
                          : 'Other'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </section>

      <Panel
        tone="muted"
        title="Recent simulations"
        description="Lab runs and surface tests that exercised the engine."
        actions={
          <ButtonLink href="/simulations" variant="ghost" size="sm" className="text-cherry-100">
            View all →
          </ButtonLink>
        }
      >
        {stats.recentSimulations.length === 0 ? (
          <EmptyState
            title="No simulations yet"
            description="Use the Simulate page to test merchants, amounts, and categories against your setup."
            actionLabel="Simulate a swipe"
            actionHref="/simulate"
          />
        ) : (
          <ul className="divide-y divide-ink-800/60 text-sm text-cloud-50">
            {stats.recentSimulations.map((sim) => (
              <li key={sim.id} className="flex items-center justify-between py-2">
                <div className="min-w-0">
                  <p className="truncate">
                    {sim.merchantLabel}
                    <span className="ml-1 text-cloud-300">
                      · {formatMoney(sim.amountCents, sim.currency)}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-cloud-400">{formatTimestamp(sim.occurredAt)}</p>
                </div>
                <div className="ml-3 flex flex-col items-end gap-1">
                  {hasText(sim.recommendedCardName) && (
                    <p className="text-xs text-cloud-300">{sim.recommendedCardName}</p>
                  )}
                  <span className="inline-flex items-center rounded-full border border-ink-800/80 bg-ink-900 px-2 py-0.5 text-xs text-cloud-100">
                    {sim.verdict}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DevShortcut
          href="/vine-simulator"
          title="Vine simulator"
          description="Send Vine context (merchant + amount) without hardware."
        />
        <DevShortcut
          href="/bank-simulator"
          title="Bank / Plaid simulator"
          description="Seed bank-like events for ledger verification."
        />
        <DevShortcut
          href={ROUTES.dev.activity}
          title="Activity inspector"
          description="Raw engine activity feed for debugging."
        />
        <DevShortcut
          href="/admin"
          title="Admin & tools"
          description="Seed/nuke demo data and basic health."
        />
      </section>
    </div>
  );
}
