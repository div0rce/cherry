import type { JSX } from 'react';
import Link from 'next/link';
import { requireUserContext } from '@/app/(user)/_lib/api';
export const dynamic = 'force-dynamic';



export default async function BucketsPage(): Promise<JSX.Element> {
  await requireUserContext();

  return (
    <div className="space-y-4 pb-8">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Buckets</p>
        <h1 className="text-2xl font-semibold text-[#0F172A]">Buckets overview</h1>
        <p className="text-sm text-slate-600">
          Read-only bucket preview for now. Use the dev console to edit buckets while the user shell
          lands.
        </p>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-600">
          Bucket editing is gated to the dev console for now. Head to{' '}
          <Link href="/dev/buckets" className="font-semibold text-[#C21733] hover:text-[#A01029]">
            /dev/buckets
          </Link>{' '}
          to manage limits, then return here to monitor.
        </p>
      </div>
    </div>
  );
}
