import type { JSX } from 'react';
import Link from 'next/link';
import type { SessionSummary } from '../../../lib/sessions/summaries.js';
import { formatCents } from '../../../lib/ui/money.js';
import { fetchFromApi, requireUserContext } from '../_lib/api.js';
import { LoadError } from '../_components/LoadError.js';
export const dynamic = 'force-dynamic';

type SessionsResponse = { items: SessionSummary[] };

const STATUS_LABEL: Record<SessionSummary['displayStatus'], string> = {
  OPEN: 'Open',
  EXPIRED: 'Expired',
  CONFIRMED_PENDING: 'Confirmed, points pending',
  CONFIRMED_POSTED: 'Confirmed, points posted',
};

export default async function HistoryPage(): Promise<JSX.Element> {
  await requireUserContext('/history');
  const result = await fetchFromApi<SessionsResponse>('/api/sessions?limit=20');

  return (
    <div className="space-y-4 pb-8">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">History</p>
        <h1 className="text-2xl font-semibold text-[#0F172A]">Recent recommendations</h1>
        <p className="text-sm text-slate-600">
          Each entry is advice Cherry gave before a purchase. Following it was always your choice.
        </p>
      </header>

      {!result.ok ? (
        <LoadError what="history" retryHref="/history" />
      ) : result.data.items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
          <p className="font-semibold text-[#0F172A]">Nothing here yet</p>
          <p className="mt-1">
            Saved recommendation sessions appear here. Plans from{' '}
            <Link href="/app/autopilot" className="font-semibold text-[#A01029] underline">
              Autopilot
            </Link>{' '}
            are previews and are not saved.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {result.data.items.map((item) => (
            <li key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-[#0F172A]">
                  {item.merchantName ?? 'Purchase'} · {formatCents(item.amountCents)}
                </p>
                <span className="rounded-full border border-slate-200 px-2 py-0.5 text-xs text-slate-600">
                  {STATUS_LABEL[item.displayStatus]}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {String(item.createdAt).slice(0, 10)} · {item.category.toLowerCase().replace(/_/g, ' ')}
                {item.bucketName !== null ? ` · ${item.bucketName}` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
