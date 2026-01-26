import * as React from 'react';
import { EmptyState } from './ui/empty-state.js';

type EmptyListProps = {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  className?: string;
};

/**
 * EmptyList is designed to be rendered inside a <ul>.
 * It returns a single <li> that matches Cherry's dark-glass, muted empty-state visual.
 */
export function EmptyList({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  actionHref,
  className,
}: EmptyListProps): React.ReactElement {
  return (
    <li className={className}>
      <EmptyState
        title={title}
        description={description}
        icon={icon}
        actionLabel={actionLabel}
        onAction={onAction}
        actionHref={actionHref}
      />
    </li>
  );
}
