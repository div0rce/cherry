'use client';

import type { JSX } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

type Props = {
  message: string | null;
  actionLabel?: string;
  onAction?: () => void;
};

const hasText = (value?: string | null): value is string =>
  value !== undefined && value !== null && value !== '';

export function ErrorBanner({ message, actionLabel, onAction }: Props): JSX.Element | null {
  if (!hasText(message)) return null;

  const action =
    hasText(actionLabel) && onAction ? (
      <Button variant="danger" size="sm" onClick={onAction}>
        {actionLabel}
      </Button>
    ) : null;

  return (
    <Alert
      role="alert"
      variant="danger"
      title="Error"
      description={message}
      actions={action}
      className="border border-rose-500/50"
    />
  );
}
