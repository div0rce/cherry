'use client';

import type { JSX, ReactNode } from 'react';
import { Card } from './card';
import { Button, ButtonLink } from './button';
import { cherryTextClasses } from '@/lib/ui/theme';
import { cn } from '@/lib/ui/cn';

type EmptyStateProps = {
  title: string;
  description?: string | undefined;
  actionLabel?: string | undefined;
  onAction?: (() => void) | undefined;
  actionHref?: string | undefined;
  actionNode?: ReactNode;
  icon?: ReactNode;
  variant?: 'default' | 'error';
  className?: string | undefined;
};

const hasText = (value?: string | null): value is string =>
  value !== undefined && value !== null && value !== '';

const variantClasses = {
  default: 'border-ink-700/40 bg-ink-900/60',
  error: 'border-rose-500/50 bg-rose-500/10',
};

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
  actionNode,
  icon,
  variant = 'default',
  className = '',
}: EmptyStateProps): JSX.Element {
  const hasAction =
    hasText(actionLabel) &&
    ((actionNode !== undefined && actionNode !== null) ||
      hasText(actionHref) ||
      onAction !== undefined);

  const action =
    actionNode ??
    (hasAction
      ? hasText(actionHref)
        ? (
          <ButtonLink href={actionHref} size="sm" variant={variant === 'error' ? 'danger' : 'primary'}>
            {actionLabel}
          </ButtonLink>
        )
        : (
          <Button
            size="sm"
            variant={variant === 'error' ? 'danger' : 'primary'}
            onClick={onAction}
          >
            {actionLabel}
          </Button>
        )
      : null);

  return (
    <Card
      tone="muted"
      className={cn('flex flex-col gap-3', variantClasses[variant], className)}
      padding="md"
    >
      <div className="flex items-center gap-3">
        {icon != null ? (
          <span className="text-lg text-cherry-100" aria-hidden>
            {icon}
          </span>
        ) : null}
        <div>
          <p className="text-base font-semibold text-cloud-50">{title}</p>
          {hasText(description) ? (
            <p className={cn('text-sm', cherryTextClasses.subtle)}>{description}</p>
          ) : null}
        </div>
      </div>
      {action}
    </Card>
  );
}
