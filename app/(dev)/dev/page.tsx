import type { JSX } from 'react';
import { Shell } from '../../../components/layout/Shell';
import { Panel } from '../../../components/layout/Panel';
import { EmptyState } from '../../../components/layout/EmptyState';
import { ButtonLink } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/card';
import { PageHeader } from '../../../components/ui/page-header';
import { MetricCard } from '../../../components/ui/metric-card';
import { getCurrentUserIdOrRedirect } from '../../../lib/auth';
import { getDashboardStats } from '../../../lib/dashboard';
import { ROUTES } from '../../../lib/routes';
import { prisma } from '../../../lib/prisma';

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

function formatTimestamp(date: Date, now: Date): string {
  const isToday = date.toDateString() === now.toDateString();
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  return isToday ? `Today ${formatter.format(date)}` : formatter.format(date);
}

async function deriveDataNow(userId: string): Promise<Date> {
  const [latestSession, latestBankTx] = await Promise.all([
    prisma.recommendationSession.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }),
    prisma.bankTransaction.findFirst({
      where: { userId },
      orderBy: { postedAt: 'desc' },
      select: { postedAt: true },
    }),
  ]);

  const timestamps = [latestSession?.createdAt, latestBankTx?.postedAt]
    .filter((d): d is Date => d instanceof Date)
    .map((d) => d.getTime());
  const max = timestamps.length > 0 ? Math.max(...timestamps) : null;
  return max !== null && Number.isFinite(max) ? new Date(max) : new Date(Date.UTC(1970, 0, 1));
}

function DevShortcut({ href, title, description }: { href: string; title: string; description: string }): JSX.Element {
  return (
    <Card
      tone="muted"
      padding="md"
      className="flex h-full flex-col gap-2 transition hover:-translate-y-0.5 hover:border-[#1b2645]"
    >
      <p className="text-xs uppercase tracking-[0.2em] text-[rgba(238,242,251,0.8)]">Dev tool</p>
      <p className="text-base font-semibold text-[#eef2fb]">{title}</p>
      <p className="text-sm text-[rgba(238,242,251,0.8)]">{description}</p>
      <div className="pt-1">
        <ButtonLink
          href={href}
          variant="ghost"
          size="sm"
          className="px-0 text-[#eef2fb]"
        >
          Open →
        </ButtonLink>
      </div>
    </Card>
  );
}

export default async function DashboardPage(): Promise<JSX.Element> {
  const userId = await getCurrentUserIdOrRedirect();
  const dataNow = await deriveDataNow(userId);
  const stats = await getDashboardStats(userId, { now: dataNow });

  const totalBuckets =
    stats.bucketHealth.onTrack + stats.bucketHealth.atRisk + stats.bucketHealth.overLimit;

  return (
    <Shell
      header={
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
              <ButtonLink href={ROUTES.dev.cards} variant="ghost" size="md">
                Cards
              </ButtonLink>
            </div>
          }
        />
      }
    >
      <div className="space-y-8">
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
              <Card tone="muted" padding="sm" className="border-[rgba(27,38,69,0.6)]">
                <p className="text-xs uppercase tracking-[0.2em] text-[#c3cce5]">On track</p>
                <p className="mt-1 text-xl font-semibold text-[#bff0db]">{stats.bucketHealth.onTrack}</p>
              </Card>
              <Card tone="muted" padding="sm" className="border-[rgba(27,38,69,0.6)]">
                <p className="text-xs uppercase tracking-[0.2em] text-[#c3cce5]">At risk</p>
                <p className="mt-1 text-xl font-semibold text-amber-200">{stats.bucketHealth.atRisk}</p>
              </Card>
              <Card tone="muted" padding="sm" className="border-[rgba(27,38,69,0.6)]">
                <p className="text-xs uppercase tracking-[0.2em] text-[#c3cce5]">Over limit</p>
                <p className="mt-1 text-xl font-semibold text-rose-200">{stats.bucketHealth.overLimit}</p>
              </Card>
            </div>
            <p className="text-sm text-[#c3cce5]">
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
              <ButtonLink href={ROUTES.dev.cards} variant="ghost" size="sm" className="text-[#dbe4ff]">
                Manage cards
              </ButtonLink>
            </div>
          </Panel>

          <Panel
            tone="muted"
            title="Recent activity"
            description="What the engine has seen lately: real swipes, simulations, points events."
            actions={
              <ButtonLink href={ROUTES.dev.activity} variant="ghost" size="sm">
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
              <ul className="space-y-2 text-sm text-[#f8fafc]">
                {stats.recentUnifiedActivity.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border border-[rgba(17,26,47,0.6)] bg-[rgba(11,16,33,0.6)] px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate">
                        {item.label}
                        {item.amountCents != null && (
                          <span className="ml-1 text-[#c3cce5]">
                            · {formatMoney(item.amountCents, item.currency ?? 'USD')}
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-[#a5b0d0]">
                        {formatTimestamp(item.occurredAt, dataNow)}
                      </p>
                    </div>
                    <span className="ml-3 inline-flex items-center rounded-full border border-[rgba(27,38,69,0.6)] bg-[rgba(17,26,47,0.7)] px-2 py-0.5 text-xs text-[#dbe4ff]">
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
            <ButtonLink href="/simulations" variant="ghost" size="sm">
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
            <ul className="divide-y divide-[rgba(17,26,47,0.6)] text-sm text-[#f8fafc]">
              {stats.recentSimulations.map((sim) => (
                <li key={sim.id} className="flex items-center justify-between py-2">
                  <div className="min-w-0">
                    <p className="truncate">
                      {sim.merchantLabel}
                      <span className="ml-1 text-[#c3cce5]">
                        · {formatMoney(sim.amountCents, sim.currency)}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-[#a5b0d0]">{formatTimestamp(sim.occurredAt, dataNow)}</p>
                  </div>
                  <div className="ml-3 flex flex-col items-end gap-1">
                    {hasText(sim.recommendedCardName) && (
                      <p className="text-xs text-[#c3cce5]">{sim.recommendedCardName}</p>
                    )}
                    <span className="inline-flex items-center rounded-full border border-[rgba(17,26,47,0.8)] bg-[#0b1021] px-2 py-0.5 text-xs text-[#eef2fb]">
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
    </Shell>
  );
}
