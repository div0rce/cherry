import type { JSX } from 'react';
import Link from 'next/link';
import { requireUserContext } from '@/app/(user)/_lib/api';
export const dynamic = 'force-dynamic';



export default async function HistoryPage(): Promise<JSX.Element> {
  await requireUserContext();

  return (
    <div className="space-y-4 pb-8">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">History</p>
        <h1 className="text-2xl font-semibold text-[#0F172A]">Decision history</h1>
        <p className="text-sm text-slate-600">
          Recent simulations and advisory events will land here. For now, use the dev Activity view
          for full traces.
        </p>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-600">
          The history surface is read-only in this cut. View detailed traces in{' '}
          <Link href="/dev/activity" className="font-semibold text-[#C21733] hover:text-[#A01029]">
            /dev/activity
          </Link>{' '}
          or run Autopilot simulations from the Home tab.
        </p>
      </div>
    </div>
  );
}
