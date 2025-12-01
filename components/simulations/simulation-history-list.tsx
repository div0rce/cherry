import type { JSX, ReactNode } from 'react';
import Link from 'next/link';
import { EmptyStateCard } from '@/components/empty-state-card';

export type SimulationHistoryItem = {
  id: string;
  createdAt: string | Date;
  title: string;
  subtitle?: string;
  status?: string;
  statusTone?: 'positive' | 'negative' | 'neutral';
  meta?: string[];
  href?: string;
  action?: ReactNode;
  body?: ReactNode;
  footer?: ReactNode;
};

type EmptyState = {
  title: string;
  body: string;
  hint?: string;
  action?: ReactNode;
};

type SimulationHistoryListProps = {
  items: SimulationHistoryItem[];
  title?: string;
  subtitle?: string;
  headerAction?: ReactNode;
  toolbar?: ReactNode;
  footer?: ReactNode;
  emptyState?: EmptyState;
  error?: string | null;
  className?: string;
};

function badgeToneToClass(tone: SimulationHistoryItem['statusTone']): string {
  if (tone === 'positive') return 'bg-green-600/20 text-green-100 ring-1 ring-inset ring-green-500/30';
  if (tone === 'negative') return 'bg-red-600/25 text-red-100 ring-1 ring-inset ring-red-500/30';
  return 'bg-slate-900/80 text-slate-100 ring-1 ring-inset ring-white/5';
}

function deriveTone(status?: string): SimulationHistoryItem['statusTone'] {
  if (!status) return 'neutral';
  const normalized = status.toUpperCase();
  if (normalized === 'APPROVED' || normalized === 'SUCCESS') return 'positive';
  if (normalized === 'DECLINED' || normalized === 'FAILED') return 'negative';
  return 'neutral';
}

function formatTimestamp(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return date.toLocaleString();
}

export function SimulationHistoryList({
  items,
  title,
  subtitle,
  headerAction,
  toolbar,
  footer,
  emptyState,
  error,
  className,
}: SimulationHistoryListProps): JSX.Element {
  const containerClasses = [
    'rounded-2xl border border-white/5 bg-slate-950/60 shadow-lg backdrop-blur text-slate-100',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const emptyStateContent: EmptyState = emptyState ?? {
    title: 'No simulations yet',
    body: 'Run your first simulation to see how a purchase affects your buckets and card strategy.',
    hint: 'Use the form on this page to run a scenario, and we will show it here.',
  };

  const headerExists = Boolean(title || subtitle || headerAction);
  const listHasContent = items.length > 0;
  const hasError = Boolean(error);

  return (
    <div className={containerClasses}>
      {headerExists ? (
        <div className="flex items-start justify-between gap-3 border-b border-white/5 px-4 py-3">
          <div className="space-y-0.5">
            {title ? <p className="text-sm font-semibold text-white">{title}</p> : null}
            {subtitle ? <p className="text-xs text-slate-400">{subtitle}</p> : null}
          </div>
          {headerAction ? <div className="text-sm text-pink-200">{headerAction}</div> : null}
        </div>
      ) : null}

      {toolbar ? <div className="border-b border-white/5 px-4 py-3">{toolbar}</div> : null}

      {hasError ? (
        <div className="px-4 py-5 text-sm text-red-300">{error}</div>
      ) : listHasContent ? (
        <ul className="divide-y divide-white/5">
          {items.map((item) => {
            const tone = item.statusTone ?? deriveTone(item.status);
            return (
              <li key={item.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="text-[11px] uppercase tracking-label-tight text-slate-500">
                      {formatTimestamp(item.createdAt)}
                    </p>
                    <p className="truncate text-lg font-semibold text-white">{item.title}</p>
                    {item.subtitle ? (
                      <p className="truncate text-sm text-slate-300">{item.subtitle}</p>
                    ) : null}
                    {item.meta && item.meta.length > 0 ? (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {item.meta.map((meta) => (
                          <span
                            key={`${item.id}-${meta}`}
                            className="inline-flex items-center rounded-full bg-slate-900/80 px-2 py-0.5 text-[11px] text-slate-300 ring-1 ring-inset ring-white/5"
                          >
                            {meta}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-end gap-2 text-sm">
                    {item.status ? (
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${badgeToneToClass(tone)}`}
                      >
                        {item.status}
                      </span>
                    ) : null}
                    {item.action ? (
                      item.action
                    ) : item.href ? (
                      <Link href={item.href} className="text-sm text-pink-200 hover:text-pink-100">
                        Open →
                      </Link>
                    ) : null}
                  </div>
                </div>

                {item.body ? <div className="space-y-2 text-sm text-slate-200">{item.body}</div> : null}

                {item.footer ? (
                  <div className="flex flex-col gap-1 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
                    {item.footer}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="px-4 py-5">
          <EmptyStateCard
            title={emptyStateContent.title}
            body={emptyStateContent.body}
            action={emptyStateContent.action}
            {...(emptyStateContent.hint ? { hint: emptyStateContent.hint } : {})}
          />
        </div>
      )}

      {footer && !hasError && listHasContent ? (
        <div className="border-t border-white/5 px-4 py-3">{footer}</div>
      ) : null}
    </div>
  );
}
