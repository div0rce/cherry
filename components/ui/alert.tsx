'use client';

import type { JSX, ReactNode } from 'react';
import { Card } from './card.js';
import { cn } from '@/lib/ui/cn';

type AlertVariant = 'info' | 'success' | 'warning' | 'danger';

const variantClasses: Record<AlertVariant, string> = {
  info: 'border-[rgba(27,38,69,0.6)] bg-[rgba(11,16,33,0.7)] text-[#f8fafc]',
  success: 'border-[rgba(52,211,153,0.5)] bg-[rgba(52,211,153,0.1)] text-[#e6f8f1]',
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
      className={cn('border shadow-[0_15px_45px_-30px_rgba(0,0,0,0.65)]', variantClasses[variant], className)}
    >
      <div
        className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
        role={resolvedRole}
      >
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#c3cce5]">{variant}</p>
          <p className="text-base font-semibold leading-tight">{title}</p>
          {hasText(description) ? (
            <p className="text-sm text-[rgba(195,204,229,0.9)]">{description}</p>
          ) : null}
        </div>
        {actions != null ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </Card>
  );
}
