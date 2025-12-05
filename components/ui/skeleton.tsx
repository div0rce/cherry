'use client';

import type { JSX } from 'react';
import { cn } from '@/lib/ui/cn';

type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className }: SkeletonProps): JSX.Element {
  return <div className={cn('animate-pulse rounded-lg bg-ink-800/70', className)} aria-hidden />;
}

export function SkeletonText({ lines = 3 }: { lines?: number }): JSX.Element {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, idx) => (
        <Skeleton key={idx} className="h-3 w-full" />
      ))}
    </div>
  );
}

export function SkeletonRows({
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
