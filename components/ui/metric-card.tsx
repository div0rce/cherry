'use client';

import type { JSX, ReactNode } from 'react';
import { cn } from '@/lib/ui/cn';
import { cherryTextClasses } from '@/lib/ui/theme';

type MetricCardProps = {
  label: string;
  value: string | number | ReactNode;
  helper?: string;
  tone?: 'default' | 'positive' | 'negative' | 'accent';
  icon?: ReactNode;
};

const toneStyles = {
  default: 'border-ink-700/60 bg-ink-900/70 shadow-soft',
  positive: 'border-mint-400/50 bg-mint-400/10 shadow-soft',
  negative: 'border-rose-500/50 bg-rose-500/10 shadow-soft',
  accent: 'border-cherry-500/50 bg-cherry-500/10 shadow-soft',
} as const;

export function MetricCard({
  label,
  value,
  helper,
  tone = 'default',
  icon,
}: MetricCardProps): JSX.Element {
  const valueColor =
    tone === 'positive'
      ? 'text-mint-100'
      : tone === 'negative'
        ? 'text-rose-50'
        : tone === 'accent'
          ? 'text-cherry-100'
          : 'text-cloud-50';

  return (
    <div className={cn('rounded-2xl border p-4', toneStyles[tone])}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-label text-cloud-300">{label}</p>
          <p className={cn('mt-2 text-3xl font-semibold leading-tight', valueColor)}>{value}</p>
          {helper != null && helper !== '' ? (
            <p className={cn('mt-1 text-sm', cherryTextClasses.subtle)}>{helper}</p>
          ) : null}
        </div>
        {icon != null ? <div className="text-lg text-cloud-200">{icon}</div> : null}
      </div>
    </div>
  );
}
