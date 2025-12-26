import type { JSX, ReactNode } from 'react';
import { Button, ButtonLink } from '../ui/Button.js';
import { cn } from '../../lib/ui/cn.js';

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
};

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
}: EmptyStateProps): JSX.Element {
  const hasDescription = typeof description === 'string' && description.trim().length > 0;
  const hasActionLabel = typeof actionLabel === 'string' && actionLabel.trim().length > 0;
  const hasActionHref = typeof actionHref === 'string' && actionHref.trim().length > 0;
  const hasAction = hasActionLabel && (hasActionHref || onAction != null);

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-lg border border-[#1b2645] bg-[#111a2f] px-6 py-10 text-center shadow-sm',
        className
      )}
    >
      {icon != null ? <div className="text-2xl">{icon}</div> : null}
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-[#eef2fb]">{title}</h3>
        {hasDescription ? <p className="text-sm text-[rgba(238,242,251,0.8)]">{description}</p> : null}
      </div>
      {hasAction ? (
        hasActionHref ? (
          <ButtonLink variant="primary" size="md" href={actionHref}>
            {actionLabel}
          </ButtonLink>
        ) : (
          <Button variant="primary" size="md" onClick={onAction}>
            {actionLabel}
          </Button>
        )
      ) : null}
      {!hasAction && hasActionLabel ? (
        <div className="text-sm text-[rgba(238,242,251,0.8)]">No action provided.</div>
      ) : null}
    </div>
  );
}
