'use client';

import type { JSX, ReactNode } from 'react';

type PanelProps = {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  padded?: boolean;
  className?: string;
};

const hasText = (value?: string | null): value is string =>
  value !== undefined && value !== null && value !== '';

export function Panel({
  title,
  description,
  actions,
  children,
  padded = true,
  className = '',
}: PanelProps): JSX.Element {
  const padding = padded ? 'p-4 md:p-5' : '';
  const hasHeader =
    hasText(title) || hasText(description) || actions !== undefined && actions !== null;
  return (
    <section
      className={`rounded-2xl border border-white/5 bg-slate-950/60 shadow-lg backdrop-blur ${padding} ${className}`}
    >
      {hasHeader && (
        <div className="mb-4 flex flex-col gap-3 border-b border-white/5 pb-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            {hasText(title) ? <h2 className="text-lg font-semibold text-white">{title}</h2> : null}
            {hasText(description) ? <p className="text-sm text-slate-400">{description}</p> : null}
          </div>
          {actions != null ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      )}
      <div className="space-y-3">{children}</div>
    </section>
  );
}
