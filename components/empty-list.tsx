import * as React from 'react';
import { EMPTY_STATE_CARD_CLASSES } from '@/lib/ui';

type EmptyListProps = {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
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
  action,
  className,
}: EmptyListProps): React.ReactElement {
  const classes = [
    EMPTY_STATE_CARD_CLASSES,
    'flex items-start gap-3 text-xs text-slate-400',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <li className={classes}>
      {icon ? (
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-slate-900/70 text-[0.65rem] text-slate-300">
          {icon}
        </div>
      ) : null}

      <div className="flex-1 space-y-1">
        <p className="text-[0.7rem] font-medium uppercase tracking-wide text-slate-300">{title}</p>
        {description ? (
          <p className="text-[0.7rem] leading-relaxed text-slate-500">{description}</p>
        ) : null}
        {action ? <div className="pt-1 text-[0.7rem]">{action}</div> : null}
      </div>
    </li>
  );
}
