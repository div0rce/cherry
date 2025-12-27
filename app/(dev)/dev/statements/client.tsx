'use client';

import type { JSX } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { ROUTES } from '../../../../lib/routes';

export default function MonthPicker({ initialMonth }: { initialMonth: string }): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentValue = searchParams.get('month') ?? initialMonth;

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[rgba(17,26,47,0.6)] bg-[rgba(11,16,33,0.7)] p-3 shadow-[0_15px_45px_-30px_rgba(0,0,0,0.65)]">
      <label className="flex flex-col gap-1 text-[11px] uppercase tracking-[0.2em] text-[#c3cce5]">
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
          className="rounded-lg border border-[rgba(27,38,69,0.6)] bg-[#0b1021] px-3 py-2 text-sm text-[#f8fafc] shadow-inner focus:outline-[2px_solid_#ff6b8a] focus:outline-offset-2"
        />
      </label>
      {isPending ? <span className="text-xs text-[#a5b0d0]">Loading…</span> : null}
    </div>
  );
}
