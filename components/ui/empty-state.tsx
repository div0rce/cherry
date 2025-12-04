'use client';

import type { JSX, ReactNode } from 'react';

type EmptyStateProps = {
  title: string;
  description?: string | undefined;
  actionLabel?: string | undefined;
  onAction?: (() => void) | undefined;
  actionHref?: string | undefined;
  actionNode?: ReactNode;
  icon?: ReactNode;
  variant?: 'default' | 'error' | undefined;
  className?: string | undefined;
};

const hasText = (value?: string | null): value is string =>
  value !== undefined && value !== null && value !== '';

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
  actionNode,
  icon,
  variant = 'default',
  className = '',
}: EmptyStateProps): JSX.Element {
  const isError = variant === 'error';
  const border = isError ? 'border-rose-500/40' : 'border-white/10';
  const bg = isError ? 'bg-rose-950/50' : 'bg-slate-900/60';
  const text = isError ? 'text-rose-100' : 'text-slate-200';

  const hasAction =
    hasText(actionLabel) &&
    ((actionNode !== undefined && actionNode !== null) ||
      hasText(actionHref) ||
      onAction !== undefined);
  const action =
    actionNode ??
    (hasAction
      ? hasText(actionHref)
        ? (
          <a
            href={actionHref}
            className="inline-flex items-center rounded-md bg-pink-600 px-3 py-2 text-sm font-semibold text-white shadow hover:bg-pink-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-300"
          >
            {actionLabel}
          </a>
        )
        : (
          <button
            type="button"
            onClick={onAction}
            className="inline-flex items-center rounded-md bg-pink-600 px-3 py-2 text-sm font-semibold text-white shadow hover:bg-pink-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-300"
          >
            {actionLabel}
          </button>
        )
      : null);

  return (
    <div
      className={`flex flex-col items-start gap-3 rounded-2xl border ${border} ${bg} p-4 ${className}`}
    >
      <div className="flex items-center gap-3">
        {icon != null ? <span className="text-lg text-pink-200" aria-hidden>{icon}</span> : null}
        <div>
          <p className={`text-base font-semibold ${text}`}>{title}</p>
          {hasText(description) ? <p className="text-sm text-slate-400">{description}</p> : null}
        </div>
      </div>
      {action}
    </div>
  );
}
