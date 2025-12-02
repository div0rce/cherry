import type { JSX } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { MetricCard } from '@/components/ui/metric-card';
import { Panel } from '@/components/ui/panel';
import { EmptyState } from '@/components/ui/empty-state';
import { getCurrentUserIdOrRedirect } from '@/lib/auth';
import { getDashboardStats } from '@/lib/dashboard';

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
    <Link
      href={href}
      className="group rounded-2xl border border-white/5 bg-slate-950/60 p-4 shadow-lg transition hover:border-pink-500/50 hover:bg-pink-600/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-300"
    >
      <p className="text-xs uppercase tracking-label text-slate-400">Dev tool</p>
      <p className="mt-1 text-sm font-semibold text-white">{title}</p>
      <p className="mt-1 text-xs text-slate-400">{description}</p>
      <span className="mt-3 inline-flex items-center text-xs font-semibold text-pink-100 group-hover:text-white">
        Open →
      </span>
    </Link>
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
        label="Dashboard"
        title="Cherry Dev Console"
        description="Single view across spend, the engine, and dev tools. Start with cards/buckets, then simulate, scan, and inspect sessions."
        actions={
          <>
            <Link
              href="/scan"
              className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-100 hover:border-pink-500/40 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-300"
            >
              Scan
            </Link>
            <Link
              href="/simulate"
              className="rounded-md border border-pink-500/40 bg-pink-600/20 px-3 py-2 text-sm font-semibold text-pink-100 hover:bg-pink-600/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-300"
            >
              Simulate
            </Link>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Lifetime Cherry Points"
          value={stats.lifetimePoints}
          helper={`+${stats.monthPoints} this month`}
          tone="positive"
        />
        <MetricCard label="Cards" value={stats.cardCount} helper="Configured for engine use" />
        <MetricCard label="Buckets" value={stats.bucketCount} helper="Budgets tracked" />
        <MetricCard
          label="Simulations (month)"
          value={stats.simulatedTxCountMonth}
          helper={`${stats.realTxCountMonth} real tx in same period`}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <Panel
          title="Buckets health"
          description="Real-time budget state that the engine enforces during Observe → Evaluate."
        >
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-xl border border-white/5 bg-slate-900/60 p-3">
              <p className="text-xs uppercase tracking-label text-slate-500">On track</p>
              <p className="mt-1 text-xl font-semibold text-emerald-300">{stats.bucketHealth.onTrack}</p>
            </div>
            <div className="rounded-xl border border-white/5 bg-slate-900/60 p-3">
              <p className="text-xs uppercase tracking-label text-slate-500">At risk</p>
              <p className="mt-1 text-xl font-semibold text-amber-300">{stats.bucketHealth.atRisk}</p>
            </div>
            <div className="rounded-xl border border-white/5 bg-slate-900/60 p-3">
              <p className="text-xs uppercase tracking-label text-slate-500">Over limit</p>
              <p className="mt-1 text-xl font-semibold text-rose-300">{stats.bucketHealth.overLimit}</p>
            </div>
          </div>
          <p className="text-sm text-slate-400">
            {totalBuckets === 0
              ? 'No buckets configured yet. Create buckets to enforce weekly/monthly budgets.'
              : stats.bucketHealth.overLimit > 0 || stats.bucketHealth.atRisk > 0
                ? `${stats.bucketHealth.atRisk} at risk, ${stats.bucketHealth.overLimit} over limit. Inspect on the Buckets page.`
                : 'All active buckets are currently within budget.'}
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/buckets"
              className="inline-flex items-center rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-100 hover:border-pink-500/40 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-300"
            >
              Manage buckets
            </Link>
            <Link
              href="/cards"
              className="inline-flex items-center rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-100 hover:border-pink-500/40 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-300"
            >
              Manage cards
            </Link>
          </div>
        </Panel>

        <Panel
          title="Recent activity"
          description="What the engine has seen lately: real swipes, simulations, points events."
          actions={
            <Link
              href="/activity"
              className="text-sm font-semibold text-pink-200 hover:text-pink-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-300"
            >
              View all →
            </Link>
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
            <ul className="space-y-2 text-sm text-slate-100">
              {stats.recentUnifiedActivity.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between rounded-lg bg-slate-900/60 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate">
                      {item.label}
                      {item.amountCents != null && (
                        <span className="ml-1 text-slate-400">
                          · {formatMoney(item.amountCents, item.currency ?? 'USD')}
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatTimestamp(item.occurredAt)}
                    </p>
                  </div>
                  <span className="ml-3 inline-flex items-center rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-200">
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
        title="Recent simulations"
        description="Lab runs and surface tests that exercised the engine."
        actions={
          <Link
            href="/simulations"
            className="text-sm font-semibold text-pink-200 hover:text-pink-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-300"
          >
            View all →
          </Link>
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
          <ul className="divide-y divide-white/5 text-sm text-slate-100">
            {stats.recentSimulations.map((sim) => (
              <li key={sim.id} className="flex items-center justify-between py-2">
                <div className="min-w-0">
                  <p className="truncate">
                    {sim.merchantLabel}
                    <span className="ml-1 text-slate-400">
                      · {formatMoney(sim.amountCents, sim.currency)}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">{formatTimestamp(sim.occurredAt)}</p>
                </div>
                <div className="ml-3 flex flex-col items-end gap-1">
                  {sim.recommendedCardName && (
                    <p className="text-xs text-slate-400">{sim.recommendedCardName}</p>
                  )}
                  <span className="inline-flex items-center rounded-full bg-slate-900 px-2 py-0.5 text-xs">
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
          href="/dev/activity"
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
