import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function HistoryPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect(`/signin?callbackUrl=${encodeURIComponent('/history')}`);
  }

  const transactions = await prisma.simulatedTransaction.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 30,
    include: {
      chosenCard: { select: { nickname: true } },
      bucket: { select: { name: true } },
    },
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-[0.2em] text-pink-200">History</p>
        <h1 className="text-3xl font-semibold text-white">Purchase History</h1>
        <p className="text-slate-300">Recent simulated transactions across all simulations.</p>
      </header>

      <div className="rounded-2xl border border-white/5 bg-white/5 p-4 shadow-lg">
        {transactions.length === 0 ? (
          <p className="text-sm text-slate-300">
            No transactions yet. Run a simulation to populate history.
          </p>
        ) : (
          <ul className="divide-y divide-white/5">
            {transactions.map((tx) => (
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
                      Card: {tx.chosenCard?.nickname || '—'} · {tx.status}
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
      </div>

      <div className="flex items-center gap-3 text-sm text-pink-200">
        <Link href="/simulate" className="hover:text-white">
          Run a simulation →
        </Link>
      </div>
    </div>
  );
}
