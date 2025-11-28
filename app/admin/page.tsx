import type { JSX } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUserId } from '@/lib/auth';
import { getCherryPointsBalance } from '@/lib/points';
import { getSessionStats } from '@/lib/admin/getSessionStats';
import { getLedgerStats } from '@/lib/admin/getLedgerStats';
import { prisma } from '@/lib/prisma';
import AdminClient from './AdminClient';

async function getHealth() {
  const base =
    process.env['NEXT_PUBLIC_BASE_URL'] ??
    process.env.NEXTAUTH_URL ??
    '';
  const url = base ? `${base.replace(/\/$/, '')}/api/health` : '/api/health';
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return { ok: false };
    return (await res.json()) as { ok: boolean };
  } catch {
    return { ok: false };
  }
}

export default async function AdminPage(): Promise<JSX.Element> {
  let userId: string;
  try {
    userId = await getCurrentUserId();
  } catch {
    redirect(`/signin?callbackUrl=${encodeURIComponent('/admin')}`);
  }
  const [points, sessionStats, ledgerStats, health, lastSession, lastLedger] = await Promise.all([
    getCherryPointsBalance(userId),
    getSessionStats(userId),
    getLedgerStats(userId),
    getHealth(),
    prisma.recommendationSession.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.cherryPointLedger.findFirst({
      where: { userId },
      orderBy: { awardedAt: 'desc' },
    }),
  ]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-label text-pink-200">Admin</p>
        <h1 className="text-3xl font-semibold text-white">Admin & Tools</h1>
        <p className="text-slate-300">
          Dev utilities live here. Seed/nuke demo data and check basic health.
        </p>
      </header>

      <div className="rounded-2xl border border-white/5 bg-white/5 p-4 shadow-lg space-y-3">
        <h2 className="text-lg font-semibold text-white">Cherry Session Diagnostics</h2>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-white/5 bg-slate-900/40 p-3 space-y-1">
            <p className="text-sm font-semibold text-white">Total Sessions</p>
            <p className="text-2xl font-bold text-pink-400">{sessionStats.total}</p>
          </div>

          <div className="rounded-xl border border-white/5 bg-slate-900/40 p-3 space-y-1">
            <p className="text-sm font-semibold text-white">Claimed</p>
            <p className="text-2xl font-bold text-amber-300">{sessionStats.claimed}</p>
          </div>

          <div className="rounded-xl border border-white/5 bg-slate-900/40 p-3 space-y-1">
            <p className="text-sm font-semibold text-white">Verified</p>
            <p className="text-2xl font-bold text-green-400">{sessionStats.verified}</p>
          </div>

          <div className="rounded-xl border border-white/5 bg-slate-900/40 p-3 space-y-1">
            <p className="text-sm font-semibold text-white">Expired</p>
            <p className="text-2xl font-bold text-yellow-400">{sessionStats.expired}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/5 bg-white/5 p-4 shadow-lg space-y-3">
        <h2 className="text-lg font-semibold text-white">Cherry Points Ledger</h2>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-white/5 bg-slate-900/40 p-3 space-y-1">
            <p className="text-sm font-semibold text-white">Ledger Entries</p>
            <p className="text-2xl font-bold text-pink-300">{ledgerStats.entries}</p>
          </div>

          <div className="rounded-xl border border-white/5 bg-slate-900/40 p-3 space-y-1">
            <p className="text-sm font-semibold text-white">Points (Posted)</p>
            <p className="text-2xl font-bold text-green-300">{ledgerStats.points}</p>
          </div>
        </div>

        <p className="text-xs text-slate-400">
          Current Balance: <span className="text-pink-300 font-semibold">{points}</span>
        </p>
      </div>

      <AdminClient />

      {(lastSession || lastLedger) && (
        <div className="rounded-2xl border border-white/5 bg-white/5 p-4 shadow-lg space-y-3">
          <h2 className="text-lg font-semibold text-white">Recent Diagnostics</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {lastSession && (
              <div className="rounded-xl border border-white/5 bg-slate-900/40 p-3 space-y-1">
                <p className="text-sm font-semibold text-white">Last Session</p>
                <p className="text-xs text-slate-400">
                  {lastSession.merchantName ?? 'Unknown'} • $
                  {(lastSession.amountCents / 100).toFixed(2)}
                </p>
                <p className="text-xs text-slate-400">Verdict: {lastSession.verdict}</p>
                <p className="text-xs text-slate-400">Status: {lastSession.status}</p>
              </div>
            )}
            {lastLedger && (
              <div className="rounded-xl border border-white/5 bg-slate-900/40 p-3 space-y-1">
                <p className="text-sm font-semibold text-white">Last Ledger Entry</p>
                <p className="text-xs text-slate-400">Points: {lastLedger.points}</p>
                <p className="text-xs text-slate-400">Reason: {lastLedger.reason}</p>
                <p className="text-xs text-slate-400">
                  Status: {lastLedger.status} · {new Date(lastLedger.awardedAt).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-white/5 bg-white/5 p-4 shadow-lg space-y-3">
        <h2 className="text-lg font-semibold text-white">Health</h2>
        <div className="rounded-xl border border-white/5 bg-slate-900/40 p-3 space-y-2">
          <div>
            <p className="text-sm font-semibold text-white">Health check</p>
            <p className="text-xs text-slate-400">API: {health.ok ? 'OK' : 'FAIL'}</p>
          </div>

          <div className="space-y-1">
            <a
              href="/api/health"
              className="inline-block rounded-md bg-pink-600 px-3 py-2 text-sm font-semibold text-white hover:bg-pink-700 transition"
            >
              View health
            </a>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm text-pink-200">
        <Link className="hover:text-white" href="/scan">
          Scan before pay →
        </Link>
        <Link className="hover:text-white" href="/sessions">
          Sessions →
        </Link>
        <Link className="hover:text-white" href="/vine-simulator">
          Vine simulator (dev) →
        </Link>
        <Link className="hover:text-white" href="/bank-simulator">
          Bank / Plaid simulator →
        </Link>
        <Link className="hover:text-white" href="/simulate">
          Run simulation →
        </Link>
        <Link className="hover:text-white" href="/cards">
          Manage cards →
        </Link>
        <Link className="hover:text-white" href="/buckets">
          Manage buckets →
        </Link>
      </div>
    </div>
  );
}
