'use client';

import type { JSX, ReactNode } from 'react';

type PageHeaderProps = {
  title: string;
  description?: string;
  label?: string;
  actions?: ReactNode;
};

export function PageHeader({
  title,
  description,
  label,
  actions,
}: PageHeaderProps): JSX.Element {
  return (
    <header className="mb-6 flex flex-col gap-3 md:mb-8 md:flex-row md:items-center md:justify-between">
      <div className="space-y-2">
        {label ? (
          <p className="text-xs uppercase tracking-label text-pink-200" aria-label={label}>
            {label}
          </p>
        ) : null}
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold text-white">{title}</h1>
          {description ? <p className="text-sm text-slate-300">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}
