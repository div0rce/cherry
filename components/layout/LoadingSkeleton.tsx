import type { JSX } from 'react';
import { cn } from '@/lib/ui/cn';

type LoadingSkeletonProps = {
  lines?: number;
  className?: string;
};

export function LoadingSkeleton({ lines = 3, className }: LoadingSkeletonProps): JSX.Element {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className="h-4 rounded-md border border-cherry-border/60 bg-cherry-surface/80 shadow-sm animate-pulse"
        />
      ))}
    </div>
  );
}
