import * as React from 'react';
import { EmptyState } from './ui/empty-state';

type EmptyStateCardProps = {
  title: string;
  description?: string;
  body?: string;
  hint?: string;
  badge?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
};

/**
 * Deprecated wrapper maintained for backward compatibility.
 * Prefer importing EmptyState from components/ui/empty-state.
 */
export function EmptyStateCard({
  title,
  description,
  body,
  hint,
  icon,
  action,
  className,
}: EmptyStateCardProps): React.ReactElement {
  const desc = description ?? body ?? hint ?? '';
  return (
    <EmptyState
      title={title}
      description={desc}
      icon={icon}
      className={className}
      actionNode={action}
    />
  );
}
