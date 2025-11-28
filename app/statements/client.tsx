'use client';

import type { JSX } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

export default function MonthPicker({ initialMonth }: { initialMonth: string }): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentValue = searchParams.get('month') ?? initialMonth;

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/5 p-4 shadow-lg">
      <label className="flex flex-col gap-1 text-xs text-slate-300">
        Statement month
        <input
          type="month"
          value={currentValue}
          onChange={(e) =>
            startTransition(() => {
              const next = e.target.value || initialMonth;
              router.replace(`/statements?month=${next}`);
            })
          }
          className="rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white"
        />
      </label>
      {isPending ? <span className="text-xs text-slate-400">Loading…</span> : null}
    </div>
  );
}
