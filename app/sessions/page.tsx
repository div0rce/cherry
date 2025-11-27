import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

function formatCents(amount: number | null | undefined) {
  if (amount == null) return '—';
  return `$${(amount / 100).toFixed(2)}`;
}

export default async function SessionsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect(`/signin?callbackUrl=${encodeURIComponent('/sessions')}`);
  }

  const userId = session.user.id;

  const sessions = await prisma.recommendationSession.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-6 text-slate-100">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.2em] text-pink-200">Sessions</p>
        <h1 className="text-3xl font-semibold text-white">Recommendation sessions</h1>
        <p className="text-slate-300">
          Latest sessions across scans and Vine. Confirmed sessions earn Cherry Points.
        </p>
      </header>

      <div className="overflow-x-auto rounded-2xl border border-white/5 bg-white/5 shadow-lg">
        <table className="min-w-full divide-y divide-white/5 text-sm">
          <thead className="bg-slate-900/40 text-left text-slate-300">
            <tr>
              <th className="px-4 py-3 font-semibold">Created</th>
              <th className="px-4 py-3 font-semibold">Merchant / Amount</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">Verdict</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Points Offered</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-slate-200">
            {sessions.map((s) => (
              <tr key={s.id} className="hover:bg-white/5">
                <td className="px-4 py-3 text-slate-400">
                  {new Date(s.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-white">{s.merchantName ?? 'Unknown'}</div>
                  <div className="text-xs text-slate-400">{formatCents(s.amountCents)}</div>
                </td>
                <td className="px-4 py-3">{s.category}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-pink-600/20 px-2 py-1 text-xs font-semibold text-pink-100">
                    {s.verdict}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-200">{s.status}</td>
                <td className="px-4 py-3 text-slate-200">{s.cherryPointsOffered}</td>
              </tr>
            ))}
            {sessions.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-slate-400" colSpan={6}>
                  No sessions yet. Try the scan flow to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
