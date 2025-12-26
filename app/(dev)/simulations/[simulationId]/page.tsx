import type { JSX } from 'react';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '../../../../lib/prisma.js';
import Link from 'next/link';
import { EmptyState } from '../../../../components/ui/empty-state.js';
import { getCurrentUserId } from '../../../../lib/auth.js';
import { hasText } from '../../../../lib/text.js';

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function SimulationDetailPage({
  params,
}: {
  params: Promise<{ simulationId: string }>;
}): Promise<JSX.Element | null> {
  const { simulationId } = await params;
  let userId: string;
  try {
    userId = await getCurrentUserId();
  } catch (_error: unknown) {
    redirect(`/signin?callbackUrl=${encodeURIComponent(`/simulations/${simulationId}`)}`);
    return null;
  }

  const sim = await prisma.simulation.findFirst({
    where: { id: simulationId, userId },
    include: {
      transactions: {
        orderBy: { createdAt: 'asc' },
        include: {
          chosenCard: { select: { nickname: true } },
          bucket: { select: { name: true } },
        },
      },
    },
  });

  if (!sim) return notFound();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-[0.2em] text-pink-200">Simulation</p>
        <h1 className="text-3xl font-semibold text-white">
          {hasText(sim.name) ? sim.name : 'Simulation'} · {sim.id.slice(0, 6)}
        </h1>
        <p className="text-slate-300">
          Created {new Date(sim.createdAt).toLocaleString()} · {sim.transactions.length} txns
        </p>
      </header>

      <section className="rounded-2xl border border-white/5 bg-white/5 p-4 shadow-lg">
        {sim.transactions.length === 0 ? (
          <EmptyState
            title="No transactions yet"
            description="Run this simulation to generate transaction detail. Each run shows bucket impact and chosen card."
          />
        ) : (
          <ul className="divide-y divide-white/5">
            {sim.transactions.map((tx, idx) => (
              <li key={tx.id} className="py-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-white">
                      #{idx + 1} · {hasText(tx.merchantName) ? tx.merchantName : 'Merchant N/A'}
                    </p>
                    <p className="text-xs text-slate-400">
                      {tx.resolvedCategory} · {formatCents(tx.amount)} ·{' '}
                      {tx.bucket !== null && tx.bucket !== undefined ? tx.bucket.name : 'No bucket'}
                    </p>
                    <p className="text-xs text-slate-500">
                      Card: {hasText(tx.chosenCard?.nickname) ? tx.chosenCard?.nickname : '—'} ·{' '}
                      {tx.status}
                    </p>
                  </div>
                  <span className="rounded-full bg-pink-600/20 px-2 py-1 text-[11px] text-pink-100">
                    {new Date(tx.createdAt).toLocaleString()}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex items-center gap-3 text-sm text-pink-200">
        <Link href="/simulations" className="hover:text-white">
          ← Back to simulations
        </Link>
        <Link href="/simulate" className="hover:text-white">
          Run another simulation →
        </Link>
      </div>
    </div>
  );
}
