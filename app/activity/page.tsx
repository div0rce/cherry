import type { JSX } from 'react';
import Link from 'next/link';
import { getCurrentUserIdOrRedirect } from '@/lib/auth';
import { fetchActivityFeed } from '@/lib/activity/feed';

function formatPoints(points: number | undefined | null): string {
  return `${points ?? 0} pts`;
}

export default async function ActivityPage(): Promise<JSX.Element> {
  const userId = await getCurrentUserIdOrRedirect('/activity');
  const feed = await fetchActivityFeed(userId, { limit: 100 });
  const hasRows = feed.items.length > 0;

  return (
    <main className="flex-1 overflow-y-auto px-6 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-label text-pink-200">Activity</p>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <h1 className="text-3xl font-semibold text-white">Activity</h1>
            <Link
              href="/sessions"
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 hover:border-pink-500/30 hover:text-white"
            >
              View sessions
            </Link>
          </div>
          <p className="text-slate-300">
            Latest session events and ledger changes for your account.
          </p>
        </header>

        {hasRows ? (
          <div className="space-y-3">
            {feed.items.map((item) => (
              <div
                key={`${item.type}-${item.sessionId ?? ''}-${item.occurredAt.toISOString()}-${item.points ?? ''}`}
                className="rounded-2xl border border-white/5 bg-slate-950/60 p-4 shadow hover:border-pink-500/30"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-pink-200">
                      <span>{item.type.replace(/_/g, ' ')}</span>
                      {item.sessionId && (
                        <Link
                          href={`/sessions/${item.sessionId}`}
                          className="rounded-full bg-white/10 px-2 py-1 text-[11px] font-semibold text-slate-100"
                        >
                          Session
                        </Link>
                      )}
                    </div>
                    <p className="text-sm text-slate-200">
                      {item.type === 'SESSION_CREATED' && (
                        <>
                          {item.merchantName ?? 'Manual scan'} · {item.category} ·{' '}
                          {item.amountCents != null ? `$${(item.amountCents / 100).toFixed(2)}` : '—'}
                        </>
                      )}
                      {item.type === 'SESSION_CONFIRMED' && (
                        <>Session confirmed · {item.points ? formatPoints(item.points) : ''}</>
                      )}
                      {item.type === 'LEDGER_POSTED' && <>Points posted · {formatPoints(item.points)}</>}
                      {item.type === 'LEDGER_REVOKED' && (
                        <>Points revoked · {formatPoints(item.points)}</>
                      )}
                    </p>
                    {item.verdict && (
                      <p className="text-xs text-slate-400">Verdict: {item.verdict}</p>
                    )}
                  </div>
                  <div className="text-xs text-slate-400">
                    {new Date(item.occurredAt).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/5 bg-white/5 p-4 shadow-lg">
            <p className="text-sm text-slate-300">
              No activity yet. Create a session from the Scan page to see it show up here.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
