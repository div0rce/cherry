import type { JSX } from 'react';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/auth';
import Link from 'next/link';
import type { SimulationHistoryItem } from '@/components/simulations/simulation-history-list';
import { SimulationHistoryList } from '@/components/simulations/simulation-history-list';
import { hasText } from '@/lib/text';

export default async function SimulationsPage(): Promise<JSX.Element | null> {
  let userId: string;
  try {
    userId = await getCurrentUserId();
  } catch {
    redirect(`/signin?callbackUrl=${encodeURIComponent('/simulations')}`);
    return null;
  }

  const simulations = await prisma.simulation.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      transactions: {
        select: { id: true },
      },
    },
  });

  const items: SimulationHistoryItem[] = simulations.map((sim) => ({
    id: sim.id,
    createdAt: sim.createdAt,
    title: hasText(sim.name) ? sim.name : 'Simulation',
    subtitle: `${sim.transactions.length} simulated ${
      sim.transactions.length === 1 ? 'transaction' : 'transactions'
    }`,
    meta: [`ID ${sim.id.slice(0, 6)}`],
    href: `/simulations/${sim.id}`,
  }));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-label text-pink-200">Simulations</p>
          <h1 className="text-3xl font-semibold text-white">Simulation Runs</h1>
          <p className="text-slate-300">Review your scenarios and dive into their timelines.</p>
        </div>
        <Link
          href="/simulate"
          className="rounded-md border border-pink-500/40 bg-pink-600/20 px-3 py-2 text-sm text-pink-100 hover:bg-pink-600/30"
        >
          New Simulation
        </Link>
      </header>

      <SimulationHistoryList
        items={items}
        title="Simulation history"
        subtitle="Recent simulation runs and their recorded transactions."
        emptyState={{
          title: 'No simulations yet',
          description:
            'Run your first simulation to see how your buckets behave and which card Cherry would choose.',
          actionNode: (
            <Link href="/simulate" className="text-pink-200 hover:text-pink-100">
              Run a simulation →
            </Link>
          ),
        }}
      />
    </div>
  );
}
