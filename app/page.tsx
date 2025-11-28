import type { JSX } from 'react';
import Link from 'next/link';
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

type Tone = 'default' | 'positive';

function StatCard({
  label,
  value,
  href,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  href?: string;
  tone?: Tone;
}): JSX.Element {
  const base = 'rounded-2xl border p-4 shadow-lg transition bg-white/5 border-white/5';
  const toneClass = tone === 'positive' ? 'border-emerald-500/40 bg-emerald-500/10' : '';
  const content = (
    <div className={`${base} ${toneClass}`}>
      <p className="text-xs uppercase tracking-label text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-2xl border border-transparent hover:border-pink-500/50 hover:bg-pink-600/10"
      >
        {content}
      </Link>
    );
  }
  return content;
}

function DevShortcut({ href, title }: { href: string; title: string }): JSX.Element {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-white/5 bg-white/5 p-4 shadow-lg transition hover:border-pink-500/50 hover:bg-pink-600/10"
    >
      <p className="text-xs uppercase tracking-label text-slate-400">Dev Tool</p>
      <p className="mt-1 text-sm text-slate-200">{title}</p>
      <span className="mt-3 inline-flex items-center text-xs font-semibold text-pink-100 group-hover:text-white">
        Go →
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
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-label text-pink-200">Dashboard</p>
        <h1 className="text-3xl font-semibold text-white">Cherry Dev Console</h1>
        <p className="text-slate-300">
          Cards, buckets, real and simulated activity, and Cherry Points in a single view.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-pink-500/40 bg-pink-600/10 p-4 shadow-lg">
          <p className="text-xs uppercase tracking-label text-pink-200">Cherry Points</p>
          <p className="mt-2 text-3xl font-semibold text-white">{stats.lifetimePoints}</p>
          <p className="mt-1 text-sm text-pink-100">
            +{stats.monthPoints} this month across recent events.
          </p>
        </div>

        <Link
          href="/cards"
          className="group rounded-2xl border border-white/5 bg-white/5 p-4 shadow-lg transition hover:border-pink-500/50 hover:bg-pink-600/10"
        >
          <p className="text-xs uppercase tracking-label text-pink-200">1. Cards &amp; Buckets</p>
          <p className="mt-1 text-sm text-slate-200">
            Define cards, rewards, and budgets so activity can be evaluated.
          </p>
          <span className="mt-3 inline-flex items-center text-xs font-semibold text-pink-100 group-hover:text-white">
            Go →
          </span>
        </Link>

        <Link
          href="/simulate"
          className="group rounded-2xl border border-white/5 bg-white/5 p-4 shadow-lg transition hover:border-pink-500/50 hover:bg-pink-600/10"
        >
          <p className="text-xs uppercase tracking-label text-pink-200">2. Simulate a swipe</p>
          <p className="mt-1 text-sm text-slate-200">
            Test merchants, amounts, and categories against your setup.
          </p>
          <span className="mt-3 inline-flex items-center text-xs font-semibold text-pink-100 group-hover:text-white">
            Run simulation →
          </span>
        </Link>

        <Link
          href="/statements"
          className="group hidden rounded-2xl border border-white/5 bg-white/5 p-4 shadow-lg transition hover:border-pink-500/50 hover:bg-pink-600/10 lg:block"
        >
          <p className="text-xs uppercase tracking-label text-pink-200">3. Statements</p>
          <p className="mt-1 text-sm text-slate-200">
            Monthly rollups of real activity, credits, and Cherry Points.
          </p>
          <span className="mt-3 inline-flex items-center text-xs font-semibold text-pink-100 group-hover:text-white">
            Open statements →
          </span>
        </Link>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Cards" value={stats.cardCount} href="/cards" />
        <StatCard label="Buckets" value={stats.bucketCount} href="/buckets" />
        <StatCard label="Real tx (month)" value={stats.realTxCountMonth} href="/activity" />
        <StatCard label="Simulated (month)" value={stats.simulatedTxCountMonth} href="/simulations" />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/5 bg-white/5 p-4 shadow-lg">
          <p className="text-xs uppercase tracking-label text-slate-400">Buckets health</p>
          <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs uppercase tracking-label text-slate-500">On track</p>
              <p className="mt-1 text-xl font-semibold text-emerald-300">
                {stats.bucketHealth.onTrack}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-label text-slate-500">At risk</p>
              <p className="mt-1 text-xl font-semibold text-amber-300">
                {stats.bucketHealth.atRisk}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-label text-slate-500">Over limit</p>
              <p className="mt-1 text-xl font-semibold text-rose-300">
                {stats.bucketHealth.overLimit}
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-400">
            {totalBuckets === 0
              ? 'No buckets configured yet. Create buckets to enforce weekly/monthly budgets.'
              : stats.bucketHealth.overLimit > 0 || stats.bucketHealth.atRisk > 0
                ? `${stats.bucketHealth.atRisk} at risk, ${stats.bucketHealth.overLimit} over limit. Inspect on the Buckets page.`
                : 'All active buckets are currently within budget.'}
          </p>
        </div>

        <div className="rounded-2xl border border-white/5 bg-white/5 p-4 shadow-lg">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-label text-slate-400">Recent</p>
              <h2 className="text-lg font-semibold text-white">Activity</h2>
              <p className="text-xs text-slate-500">Last 5 events</p>
            </div>
            <Link href="/activity" className="text-sm text-pink-200 hover:text-pink-100">
              View all →
            </Link>
          </div>

          {stats.recentUnifiedActivity.length === 0 ? (
            <div className="space-y-3 text-sm text-slate-400">
              <p>No activity yet. Run a simulation or use the Vine / Bank simulators to generate events.</p>
              <Link
                href="/simulate"
                className="inline-flex items-center rounded-md border border-pink-500/40 bg-pink-600/20 px-3 py-2 text-xs font-semibold text-pink-100 hover:bg-pink-600/30"
              >
                Run a simulation
              </Link>
            </div>
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
        </div>
      </section>

      <section className="rounded-2xl border border-white/5 bg-white/5 p-4 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-label text-slate-400">Recent</p>
            <h2 className="text-lg font-semibold text-white">Simulations</h2>
          </div>
          <Link href="/simulations" className="text-sm text-pink-200 hover:text-pink-100">
            View all →
          </Link>
        </div>

        {stats.recentSimulations.length === 0 ? (
          <p className="text-sm text-slate-400">
            No simulations yet. Use the Simulate page to test swipes against your current configuration.
          </p>
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
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <DevShortcut href="/vine-simulator" title="Vine Terminal Simulator" />
        <DevShortcut href="/bank-simulator" title="Bank / Plaid Simulator" />
        <DevShortcut href="/dev/activity" title="Activity Inspector" />
        <DevShortcut href="/admin" title="Admin & Tools" />
      </section>
    </div>
  );
}
