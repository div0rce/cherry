import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { getCherryPointsBalance } from '@/lib/points';

function formatCents(amount: number) {
  return `$${(amount / 100).toFixed(2)}`;
}

function formatRelative(date: Date) {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / (1000 * 60));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect(`/signin?callbackUrl=${encodeURIComponent('/')}`);
  }

  const userId = session.user.id;

  const [cardsCount, bucketsCount, simulationsCount, transactionsCount] = await Promise.all([
    prisma.card.count({ where: { userId } }),
    prisma.bucket.count({ where: { userId } }),
    prisma.simulation.count({ where: { userId } }),
    prisma.simulatedTransaction.count({ where: { userId } }),
  ]);
  const cherryPoints = await getCherryPointsBalance(userId);

  const recentSimulations = await prisma.simulation.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, name: true, createdAt: true },
  });

  const simulationIds = recentSimulations.map((s) => s.id);
  const simCounts = simulationIds.length
    ? await prisma.simulatedTransaction.groupBy({
        by: ['simulationId'],
        where: { userId, simulationId: { in: simulationIds } },
        _count: { _all: true },
      })
    : [];
  const simCountMap = simCounts.reduce<Record<string, number>>((acc, entry) => {
    if (entry.simulationId) acc[entry.simulationId] = entry._count._all;
    return acc;
  }, {});

  const recentTransactions = await prisma.simulatedTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 6,
    include: {
      chosenCard: { select: { nickname: true } },
      bucket: { select: { name: true } },
    },
  });

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.25em] text-pink-200">Cherry Lab</p>
        <h1 className="text-3xl font-semibold text-white">Cherry Dev Console</h1>
        <p className="text-slate-300">
          Simulate card routing, rewards, and bucket budgets. Flow: Cards → Buckets → Simulate →
          Inspect.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-pink-500/40 bg-pink-600/10 p-4 shadow-lg">
          <p className="text-xs uppercase tracking-[0.2em] text-pink-200">Cherry Points</p>
          <p className="mt-2 text-3xl font-semibold text-white">{cherryPoints}</p>
          <p className="mt-1 text-sm text-pink-100">
            Earn points when you follow Cherry&apos;s recommendations.
          </p>
        </div>
        <QuickLink
          title="1. Add a card"
          description="Issuer, network, type, annual fee, and reward rules."
          href="/cards"
        />
        <QuickLink
          title="2. Create buckets"
          description="Weekly/monthly budgets with strict mode options."
          href="/buckets"
        />
        <QuickLink
          title="3. Run a simulation"
          description="Test a swipe: amount, merchant, category."
          href="/simulate"
        />
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total Cards" value={cardsCount} href="/cards" />
        <StatCard label="Total Buckets" value={bucketsCount} href="/buckets" />
        <StatCard label="Simulations" value={simulationsCount} href="/simulations" />
        <StatCard label="Transactions" value={transactionsCount} href="/history" />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/5 bg-white/5 p-4 shadow-lg">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Recent</p>
              <h2 className="text-lg font-semibold text-white">Simulations</h2>
            </div>
            <Link href="/simulations" className="text-sm text-pink-200 hover:text-pink-100">
              View all →
            </Link>
          </div>
          {recentSimulations.length === 0 ? (
            <p className="text-sm text-slate-400">No simulations yet. Run one to see results.</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {recentSimulations.map((sim) => (
                <li key={sim.id} className="py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {sim.name || 'Simulation'} · {sim.id.slice(0, 6)}
                      </p>
                      <p className="text-xs text-slate-400">
                        {formatRelative(sim.createdAt)} · {simCountMap[sim.id] || 0} txns
                      </p>
                    </div>
                    <Link
                      href={`/simulations/${sim.id}`}
                      className="text-sm text-pink-200 hover:text-pink-100"
                    >
                      Open
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-white/5 bg-white/5 p-4 shadow-lg">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Recent</p>
              <h2 className="text-lg font-semibold text-white">Transactions</h2>
            </div>
            <Link href="/history" className="text-sm text-pink-200 hover:text-pink-100">
              View all →
            </Link>
          </div>
          {recentTransactions.length === 0 ? (
            <p className="text-sm text-slate-400">
              No transactions yet. Simulate a swipe to populate history.
            </p>
          ) : (
            <ul className="divide-y divide-white/5">
              {recentTransactions.map((tx) => (
                <li key={tx.id} className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-white">
                        {tx.merchantName || 'Merchant N/A'}
                      </p>
                      <p className="text-xs text-slate-400">
                        {tx.resolvedCategory} · {formatCents(tx.amount)} ·{' '}
                        {tx.bucket ? tx.bucket.name : 'No bucket'}
                      </p>
                      <p className="text-xs text-slate-500">
                        Card: {tx.chosenCard?.nickname || '—'} · {formatRelative(tx.createdAt)}
                      </p>
                    </div>
                    <span className="rounded-full bg-pink-600/20 px-2 py-1 text-[11px] text-pink-100">
                      {tx.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function QuickLink({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-white/5 bg-white/5 p-4 shadow-lg transition hover:border-pink-500/50 hover:bg-pink-600/10"
    >
      <p className="text-xs uppercase tracking-[0.2em] text-pink-200">{title}</p>
      <p className="text-sm text-slate-200 mt-1">{description}</p>
      <span className="mt-3 inline-flex items-center text-xs font-semibold text-pink-100 group-hover:text-white">
        Go →
      </span>
    </Link>
  );
}

function StatCard({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-white/5 bg-white/5 p-4 shadow-lg transition hover:border-pink-500/50 hover:bg-pink-600/10"
    >
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
    </Link>
  );
}
