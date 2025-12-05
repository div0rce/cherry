'use client';

import type { JSX } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { ROUTES } from '@/lib/routes';

export default function MonthPicker({ initialMonth }: { initialMonth: string }): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentValue = searchParams.get('month') ?? initialMonth;

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-ink-800/60 bg-ink-900/70 p-3 shadow-soft">
      <label className="flex flex-col gap-1 text-[11px] uppercase tracking-label text-cloud-300">
        Statement month
        <input
          type="month"
          value={currentValue}
          onChange={(e) =>
            startTransition(() => {
              const next = e.target.value !== '' ? e.target.value : initialMonth;
              router.replace(`${ROUTES.dev.statements}?month=${next}`);
            })
          }
          className="rounded-lg border border-ink-700/60 bg-ink-900 px-3 py-2 text-sm text-cloud-50 shadow-inner focus:outline-2 focus:outline-offset-2 focus:outline-cherry-400"
        />
      </label>
      {isPending ? <span className="text-xs text-cloud-400">Loading…</span> : null}
    </div>
  );
}
