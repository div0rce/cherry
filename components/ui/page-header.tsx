'use client';

import type { JSX, ReactNode } from 'react';
import { cn } from '../../lib/ui/cn';

type PageHeaderProps = {
  title: string;
  description?: string;
  label?: string;
  badge?: string;
  actions?: ReactNode;
  className?: string;
};

const hasText = (value?: string | null): value is string =>
  value !== undefined && value !== null && value !== '';

const badgeClasses =
  'inline-flex items-center rounded-full border border-[rgba(27,38,69,0.6)] bg-[rgba(17,26,47,0.8)] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#dbe4ff]';

export function PageHeader({
  title,
  description,
  label,
  badge,
  actions,
  className = '',
}: PageHeaderProps): JSX.Element {
  return (
    <header
      className={cn(
        'flex flex-col gap-3 rounded-2xl border border-[rgba(27,38,69,0.6)] bg-[rgba(11,16,33,0.6)] p-4 shadow-[0_15px_45px_-30px_rgba(0,0,0,0.65)] backdrop-blur md:p-5',
        className
      )}
    >
      {(hasText(label) || hasText(badge)) && (
        <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[#c3cce5]">
          {hasText(label) ? (
            <span className={badgeClasses} aria-label={label}>
              {label}
            </span>
          ) : null}
          {hasText(badge) ? (
            <span
              className={cn(
                badgeClasses,
                'border-[rgba(255,77,109,0.5)] bg-[rgba(255,77,109,0.15)] text-[#ffe6ee]'
              )}
            >
              {badge}
            </span>
          ) : null}
        </div>
      )}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold leading-tight text-[#f8fafc]">{title}</h1>
          {hasText(description) ? (
            <p className={cn('text-sm md:max-w-3xl text-[#c3cce5]')}>{description}</p>
          ) : null}
        </div>
        {actions != null ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
