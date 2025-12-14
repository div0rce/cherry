'use client';

import type { JSX, ReactNode } from 'react';
import { Card } from './card';
import { cn } from '@/lib/ui/cn';

type PanelProps = {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  padded?: boolean;
  className?: string;
  tone?: 'base' | 'muted' | 'accent';
  footer?: ReactNode;
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
  tone = 'base',
  footer,
}: PanelProps): JSX.Element {
  const hasHeader = hasText(title) || hasText(description) || actions != null;
  const hasFooter = footer != null;

  return (
    <Card tone={tone} padding={padded ? 'md' : 'none'} className={className}>
      {hasHeader ? (
        <div className="mb-4 flex flex-col gap-3 border-b border-[rgba(27,38,69,0.5)] pb-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            {hasText(title) ? <h2 className="text-lg font-semibold text-[#f8fafc]">{title}</h2> : null}
            {hasText(description) ? (
              <p className={cn('text-sm text-[#c3cce5]')}>{description}</p>
            ) : null}
          </div>
          {actions != null ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className="space-y-3">{children}</div>
      {hasFooter ? <div className="mt-4 border-t border-[rgba(27,38,69,0.5)] pt-3">{footer}</div> : null}
    </Card>
  );
}
