'use client';

import type { JSX, ReactNode } from 'react';
import { cherryBadgeClasses, cherryTextClasses } from '@/lib/ui/theme';
import { cn } from '@/lib/ui/cn';

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
        'flex flex-col gap-3 rounded-2xl border border-ink-700/60 bg-ink-900/60 p-4 shadow-soft backdrop-blur md:p-5',
        className
      )}
    >
      {(hasText(label) || hasText(badge)) && (
        <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-label text-cloud-300">
          {hasText(label) ? (
            <span className={cherryBadgeClasses} aria-label={label}>
              {label}
            </span>
          ) : null}
          {hasText(badge) ? (
            <span
              className={cn(
                cherryBadgeClasses,
                'border-cherry-500/50 bg-cherry-500/15 text-cherry-100'
              )}
            >
              {badge}
            </span>
          ) : null}
        </div>
      )}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold leading-tight text-cloud-50">{title}</h1>
          {hasText(description) ? (
            <p className={cn('text-sm md:max-w-3xl', cherryTextClasses.subtle)}>{description}</p>
          ) : null}
        </div>
        {actions != null ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
