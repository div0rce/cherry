import * as React from 'react';
import { EMPTY_STATE_CARD_CLASSES } from '@/lib/ui';

type EmptyStateCardProps = {
  title: string;
  description?: string;
  body?: string;
  hint?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
};

export function EmptyStateCard({
  title,
  description,
  body,
  hint,
  icon,
  action,
  className,
}: EmptyStateCardProps): React.ReactElement {
  const bodyText = description ?? body ?? '';
  const classes = [
    EMPTY_STATE_CARD_CLASSES,
    'flex items-start gap-3 text-sm text-slate-400',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes}>
      {icon ? (
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-slate-900/70 text-xs text-slate-200">
          {icon}
        </div>
      ) : null}

      <div className="flex-1 space-y-1">
        <p className="text-[0.8rem] font-medium uppercase tracking-wide text-slate-300">{title}</p>
        {bodyText ? (
          <p className="text-[0.8rem] leading-relaxed text-slate-500">{bodyText}</p>
        ) : null}
        {hint ? <p className="text-[0.75rem] text-slate-500">{hint}</p> : null}
        {action ? <div className="pt-1 text-[0.8rem]">{action}</div> : null}
      </div>
    </div>
  );
}
