'use client';

import type { JSX } from 'react';

export function LoadingRows({
  rows = 3,
  columns = 1,
}: {
  rows?: number;
  columns?: number;
}): JSX.Element {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {Array.from({ length: columns }).map((__, colIndex) => (
            <div
              key={colIndex}
              className="h-10 animate-pulse rounded-lg bg-slate-800/60"
              aria-hidden
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function LoadingMetricGrid({
  count = 4,
}: {
  count?: number;
}): JSX.Element {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="h-24 animate-pulse rounded-2xl border border-white/5 bg-slate-800/60"
          aria-hidden
        />
      ))}
    </div>
  );
}
