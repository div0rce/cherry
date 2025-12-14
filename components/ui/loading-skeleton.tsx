'use client';

import type { JSX } from 'react';
import { Skeleton } from './skeleton';

export function LoadingRows({
  rows = 3,
  columns = 1,
}: {
  rows?: number;
  columns?: number;
}): JSX.Element {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }).map((__, colIndex) => (
            <Skeleton key={colIndex} className="h-10 w-full rounded-xl" />
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
        <Skeleton key={idx} className="h-24 w-full rounded-2xl border border-[rgba(27,38,69,0.5)]" />
      ))}
    </div>
  );
}
