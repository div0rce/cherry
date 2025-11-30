import type { JSX } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUserId } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { deriveDisplayStatus } from '@/lib/sessions/summaries';

function formatCents(amount: number | null | undefined) {
  if (amount == null) return '—';
  return `$${(amount / 100).toFixed(2)}`;
}

export default async function SessionDetailPage({
  params,
}: {
  params: { id: string };
}): Promise<JSX.Element | null> {
  let userId: string;
  try {
    userId = await getCurrentUserId();
  } catch {
    redirect('/signin');
    return null;
  }

  const { id } = params;
  const session = await prisma.recommendationSession.findFirst({
    where: { id, userId },
    include: {
      ledgerEntries: true,
      recommendedBucket: { select: { name: true, budgetAmount: true, strictMode: true } },
      recommendedCard: { select: { nickname: true } },
    },
  });

  if (!session) {
    redirect('/sessions');
    return null;
  }

  const now = new Date();
  const status = deriveDisplayStatus(session, session.ledgerEntries ?? [], now);
  const pointsPosted =
    session.ledgerEntries
      ?.filter((l) => l.status === 'POSTED')
      .reduce((acc, l) => acc + l.points, 0) ?? 0;
  const pointsPending =
    session.ledgerEntries
      ?.filter((l) => l.status === 'PENDING')
      .reduce((acc, l) => acc + l.points, 0) ?? 0;
  const firstLedger = session.ledgerEntries?.[0];
  const firstLedgerDate = firstLedger ? firstLedger.awardedAt ?? firstLedger.createdAt : null;
  const postedLedger = session.ledgerEntries?.find((l) => l.status === 'POSTED') ?? null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-6 text-slate-100">
      <Link href="/sessions" className="text-sm text-pink-200 hover:text-pink-100">
        ← Back to sessions
      </Link>

      <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-5 shadow-lg">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-label text-pink-200">Session</p>
            <h1 className="text-3xl font-semibold text-white">
              {session.merchantName ?? 'Manual scan'} · {formatCents(session.amountCents)}
            </h1>
            <p className="text-slate-300">
              {session.category} · Created {new Date(session.createdAt).toLocaleString()}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-white/10 px-2 py-1 font-semibold text-slate-100">
              Source: {session.source}
            </span>
            <span className="rounded-full bg-white/10 px-2 py-1 font-semibold text-slate-100">
              Verdict: {session.verdict}
            </span>
            <span className="rounded-full bg-white/10 px-2 py-1 font-semibold text-slate-100">
              Status: {status}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/5 bg-white/5 p-4 shadow">
          <h2 className="text-lg font-semibold text-white">Bucket impact</h2>
          <p className="text-sm text-slate-300">
            {session.recommendedBucket
              ? `Bucket: ${session.recommendedBucket.name} (${formatCents(session.recommendedBucket.budgetAmount)})`
              : 'No bucket matched this scan.'}
          </p>
          <p className="text-sm text-slate-300">
            Strict mode: {session.recommendedBucket?.strictMode ? 'On' : 'Off'}
          </p>
        </div>

        <div className="rounded-2xl border border-white/5 bg-white/5 p-4 shadow">
          <h2 className="text-lg font-semibold text-white">Points</h2>
          <div className="space-y-1 text-sm text-slate-200">
            <p>Offered: {session.cherryPointsOffered ?? 0}</p>
            <p>Pending: {pointsPending}</p>
            <p>Posted: {pointsPosted}</p>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            {pointsPosted > 0
              ? 'Points posted for this session.'
              : pointsPending > 0
                ? 'Points are pending verification.'
                : status === 'EXPIRED'
                  ? 'Session expired without points.'
                  : 'Start and confirm the session to earn points.'}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-4 shadow">
        <h2 className="text-lg font-semibold text-white">Timeline</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-200">
          <li>Recommendation generated · {new Date(session.createdAt).toLocaleString()}</li>
          {pointsPending > 0 && (
            <li>
              Session confirmed ·{' '}
              {firstLedgerDate ? new Date(firstLedgerDate).toLocaleString() : ''}
            </li>
          )}
          {pointsPosted > 0 && (
            <li>
              Points posted ·{' '}
              {new Date((postedLedger?.awardedAt ?? session.updatedAt).getTime()).toLocaleString()}
            </li>
          )}
          {status === 'EXPIRED' && <li>Session expired · {new Date(session.expiresAt).toLocaleString()}</li>}
        </ul>
      </div>
    </div>
  );
}
