'use client';

import type { JSX, ReactNode } from 'react';
import { Card } from './card';
import { cn } from '@/lib/ui/cn';

type AlertVariant = 'info' | 'success' | 'warning' | 'danger';

const variantClasses: Record<AlertVariant, string> = {
  info: 'border-ink-700/60 bg-ink-900/70 text-cloud-50',
  success: 'border-mint-400/50 bg-mint-400/10 text-mint-100',
  warning: 'border-amber-400/60 bg-amber-400/10 text-amber-50',
  danger: 'border-rose-500/60 bg-rose-500/15 text-rose-50',
};

const hasText = (value?: string | null): value is string =>
  value !== undefined && value !== null && value !== '';

type AlertProps = {
  title: string;
  description?: string;
  variant?: AlertVariant;
  actions?: ReactNode;
  className?: string;
  role?: 'alert' | 'status';
};

export function Alert({
  title,
  description,
  variant = 'info',
  actions,
  className,
  role,
}: AlertProps): JSX.Element {
  const resolvedRole = role ?? (variant === 'danger' ? 'alert' : undefined);

  return (
    <Card
      tone="muted"
      padding="md"
      className={cn('border shadow-soft', variantClasses[variant], className)}
    >
      <div
        className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
        role={resolvedRole}
      >
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-label text-cloud-300">{variant}</p>
          <p className="text-base font-semibold leading-tight">{title}</p>
          {hasText(description) ? (
            <p className="text-sm text-cloud-300/90">{description}</p>
          ) : null}
        </div>
        {actions != null ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </Card>
  );
}
