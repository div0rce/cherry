import type { JSX } from 'react';

export default function Loading(): JSX.Element {
  return (
    <div role="status" aria-live="polite" className="space-y-3 pb-8">
      <span className="sr-only">Loading…</span>
      <div className="h-6 w-40 animate-pulse rounded bg-slate-200" />
      <div className="h-24 animate-pulse rounded-2xl bg-slate-200" />
      <div className="h-24 animate-pulse rounded-2xl bg-slate-200" />
    </div>
  );
}
