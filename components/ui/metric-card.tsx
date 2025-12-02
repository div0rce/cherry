'use client';

import type { JSX, ReactNode } from 'react';

type MetricCardProps = {
  label: string;
  value: string | number | ReactNode;
  helper?: string;
  tone?: 'default' | 'positive' | 'negative';
  icon?: ReactNode;
};

export function MetricCard({
  label,
  value,
  helper,
  tone = 'default',
  icon,
}: MetricCardProps): JSX.Element {
  const toneClass =
    tone === 'positive'
      ? 'border-emerald-500/30 bg-emerald-500/10'
      : tone === 'negative'
        ? 'border-rose-500/30 bg-rose-500/10'
        : 'border-white/5 bg-white/5';

  return (
    <div className={`rounded-2xl border ${toneClass} p-4 shadow-lg`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-label text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
          {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}
        </div>
        {icon ? <div className="text-lg text-slate-200">{icon}</div> : null}
      </div>
    </div>
  );
}
