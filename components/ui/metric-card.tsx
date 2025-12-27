'use client';

import type { JSX, ReactNode } from 'react';
import { cn } from '../../lib/ui/cn';

type MetricCardProps = {
  label: string;
  value: string | number | ReactNode;
  helper?: string;
  tone?: 'default' | 'positive' | 'negative' | 'accent';
  icon?: ReactNode;
};

const toneStyles = {
  default: 'border-[rgba(27,38,69,0.6)] bg-[rgba(11,16,33,0.7)] shadow-[0_15px_45px_-30px_rgba(0,0,0,0.65)]',
  positive: 'border-[rgba(52,211,153,0.5)] bg-[rgba(52,211,153,0.1)] shadow-[0_15px_45px_-30px_rgba(0,0,0,0.65)]',
  negative: 'border-rose-500/50 bg-rose-500/10 shadow-[0_15px_45px_-30px_rgba(0,0,0,0.65)]',
  accent: 'border-[rgba(255,77,109,0.5)] bg-[rgba(255,77,109,0.1)] shadow-[0_15px_45px_-30px_rgba(0,0,0,0.65)]',
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
      ? 'text-[#e6f8f1]'
      : tone === 'negative'
        ? 'text-rose-50'
        : tone === 'accent'
          ? 'text-[#ffe6ee]'
          : 'text-[#f8fafc]';

  return (
    <div className={cn('rounded-2xl border p-4', toneStyles[tone])}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#c3cce5]">{label}</p>
          <p className={cn('mt-2 text-3xl font-semibold leading-tight', valueColor)}>{value}</p>
          {helper != null && helper !== '' ? (
            <p className={cn('mt-1 text-sm text-[#c3cce5]')}>{helper}</p>
          ) : null}
        </div>
        {icon != null ? <div className="text-lg text-[#dbe4ff]">{icon}</div> : null}
      </div>
    </div>
  );
}
