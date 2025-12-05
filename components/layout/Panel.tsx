import type { JSX, ReactNode } from 'react';
import { cn } from '@/lib/ui/cn';

type PanelProps = {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
  tone?: 'base' | 'muted' | 'accent';
};

const hasText = (value?: string | null): value is string =>
  value !== undefined && value !== null && value.trim() !== '';

export function Panel({
  title,
  description,
  actions,
  children,
  className,
  padded = true,
  tone = 'base',
}: PanelProps): JSX.Element {
  const hasHeader = hasText(title) || hasText(description) || actions != null;
  const toneClass =
    tone === 'muted'
      ? 'bg-cherry-surface/80 border-cherry-border/80'
      : tone === 'accent'
        ? 'bg-cherry-surface border-cherry-red/60'
        : 'bg-cherry-surface border-cherry-border';

  return (
    <section
      className={cn(
        'rounded-lg text-cherry-text shadow-sm',
        toneClass,
        className
      )}
    >
      {hasHeader ? (
        <div
          className={cn(
            'flex flex-col gap-3 border-b border-cherry-border px-4 py-3 md:flex-row md:items-center md:justify-between'
          )}
        >
          <div className="space-y-1">
            {hasText(title) ? <h2 className="text-lg font-semibold">{title}</h2> : null}
            {hasText(description) ? <p className="text-sm text-cherry-text/80">{description}</p> : null}
          </div>
          {actions != null ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className={cn('space-y-3', padded ? 'p-4' : undefined)}>{children}</div>
    </section>
  );
}
