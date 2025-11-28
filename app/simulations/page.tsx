import type { JSX } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/auth';

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

      <div className="rounded-2xl border border-white/5 bg-white/5 p-4 shadow-lg">
        {simulations.length === 0 ? (
          <p className="text-sm text-slate-300">No simulations yet. Run one to see results.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {simulations.map((sim) => (
              <li key={sim.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">
                    {sim.name || 'Simulation'} · {sim.id.slice(0, 6)}
                  </p>
                  <p className="text-xs text-slate-400">
                    {new Date(sim.createdAt).toLocaleString()} · {sim.transactions.length} txns
                  </p>
                </div>
                <Link
                  href={`/simulations/${sim.id}`}
                  className="text-sm text-pink-200 hover:text-pink-100"
                >
                  Open →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
