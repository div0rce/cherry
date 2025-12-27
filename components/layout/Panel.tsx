import type { JSX, ReactNode } from 'react';
import { cn } from '../../lib/ui/cn';

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
      ? 'bg-[rgba(17,26,47,0.8)] border-[rgba(27,38,69,0.8)]'
      : tone === 'accent'
        ? 'bg-[#111a2f] border-[rgba(255,77,109,0.6)]'
        : 'bg-[#111a2f] border-[#1b2645]';

  return (
    <section
      className={cn(
        'rounded-lg text-[#eef2fb] shadow-sm',
        toneClass,
        className
      )}
    >
      {hasHeader ? (
        <div
          className={cn(
            'flex flex-col gap-3 border-b border-[#1b2645] px-4 py-3 md:flex-row md:items-center md:justify-between'
          )}
        >
          <div className="space-y-1">
            {hasText(title) ? <h2 className="text-lg font-semibold">{title}</h2> : null}
            {hasText(description) ? <p className="text-sm text-[rgba(238,242,251,0.8)]">{description}</p> : null}
          </div>
          {actions != null ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className={cn('space-y-3', padded ? 'p-4' : undefined)}>{children}</div>
    </section>
  );
}
