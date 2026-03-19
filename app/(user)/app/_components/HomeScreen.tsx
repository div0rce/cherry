import type { JSX } from 'react';
export function HomeScreen(): JSX.Element {
  return (
    <div className="mx-auto max-w-4xl pb-20">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/90 px-5 py-4 shadow-sm backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0F172A] text-base font-bold text-white shadow-sm">
            C
          </div>
          <div>
            <p className="text-sm font-semibold text-[#0F172A]">Cherry</p>
            <p className="text-xs text-slate-600">Money, in context.</p>
          </div>
        </div>
      </header>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm">
        <div className="space-y-3">
          <h1 className="text-lg font-semibold text-[#0F172A]">No live data available</h1>
          <p className="text-sm text-slate-600">
            Cherry does not have live activity for this account yet.
          </p>
          <p className="text-sm text-slate-600">
            Activity will appear once real usage is recorded.
          </p>
        </div>
      </section>
    </div>
  );
}
