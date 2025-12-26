'use client';

import type { JSX, ReactNode } from 'react';
import { Card } from './card.js';
import { Button, ButtonLink } from './Button.js';
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
  default: 'border-[rgba(27,38,69,0.4)] bg-[rgba(11,16,33,0.6)]',
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
          <ButtonLink
            href={actionHref}
            size="sm"
            variant={variant === 'error' ? 'destructive' : 'primary'}
          >
            {actionLabel}
          </ButtonLink>
        )
        : (
          <Button
            size="sm"
            variant={variant === 'error' ? 'destructive' : 'primary'}
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
          <span className="text-lg text-[#ffe6ee]" aria-hidden>
            {icon}
          </span>
        ) : null}
        <div>
          <p className="text-base font-semibold text-[#f8fafc]">{title}</p>
          {hasText(description) ? (
            <p className={cn('text-sm text-[#c3cce5]')}>{description}</p>
          ) : null}
        </div>
      </div>
      {action}
    </Card>
  );
}
