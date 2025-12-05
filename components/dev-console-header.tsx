import type { JSX, ReactNode } from 'react';
import { UserMenu } from './user-menu';
import { ButtonLink } from '@/components/ui/button';
import { cherryBadgeClasses } from '@/lib/ui/theme';
import { cn } from '@/lib/ui/cn';

type DevConsoleHeaderProps = {
  userEmail: string;
  environmentLabel?: string;
  actions?: ReactNode;
};

export function DevConsoleHeader({
  userEmail,
  environmentLabel = 'Local',
  actions,
}: DevConsoleHeaderProps): JSX.Element {
  return (
    <header className="flex flex-col gap-3 border-b border-ink-700/50 bg-ink-900/70 px-4 py-4 shadow-soft backdrop-blur md:flex-row md:items-center md:justify-between md:px-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-label text-cloud-300">
          <span
            className={cn(
              cherryBadgeClasses,
              'border-cherry-500/50 bg-cherry-500/15 text-cherry-100'
            )}
          >
            {environmentLabel}
          </span>
          <span className={cherryBadgeClasses}>Dev / Lab</span>
          <span className="hidden rounded-full bg-ink-800/60 px-2 py-1 text-cloud-300 sm:inline">
            Not user-facing
          </span>
        </div>
        <p className="text-xs text-cloud-300">Signed in as {userEmail}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm text-cloud-200">
        <ButtonLink href="/scan" variant="secondary" size="sm">
          Scan
        </ButtonLink>
        <ButtonLink href="/simulate" variant="primary" size="sm">
          Simulate
        </ButtonLink>
        {actions}
        <UserMenu email={userEmail} />
      </div>
    </header>
  );
}
