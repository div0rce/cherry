'use client';

import type { JSX } from 'react';

type Props = {
  message: string | null;
  actionLabel?: string;
  onAction?: () => void;
};

export function ErrorBanner({ message, actionLabel, onAction }: Props): JSX.Element | null {
  if (!message) return null;
  return (
    <div className="rounded-lg border border-rose-500/40 bg-rose-950/50 px-3 py-2 text-sm text-rose-100">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-0.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-200/80">Error</p>
          <p className="text-sm">{message}</p>
        </div>
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="inline-flex items-center rounded-md bg-white/10 px-3 py-1 text-xs font-semibold text-white hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-200"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
