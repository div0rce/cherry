import type { JSX, ReactNode } from 'react';
import { UserMenu } from './user-menu.js';
import { ButtonLink } from '@/components/ui/Button';
import { cn } from '@/lib/ui/cn';

type DevConsoleHeaderProps = {
  userEmail: string;
  environmentLabel?: string;
  actions?: ReactNode;
};

const badgeClasses =
  'inline-flex items-center rounded-full border border-[rgba(27,38,69,0.6)] bg-[rgba(17,26,47,0.8)] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#dbe4ff]';

export function DevConsoleHeader({
  userEmail,
  environmentLabel = 'Local',
  actions,
}: DevConsoleHeaderProps): JSX.Element {
  return (
    <header className="flex flex-col gap-3 border-b border-[rgba(27,38,69,0.5)] bg-[rgba(11,16,33,0.7)] px-4 py-4 shadow-[0_15px_45px_-30px_rgba(0,0,0,0.65)] backdrop-blur md:flex-row md:items-center md:justify-between md:px-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#c3cce5]">
          <span
            className={cn(
              badgeClasses,
              'border-[rgba(255,77,109,0.5)] bg-[rgba(255,77,109,0.15)] text-[#ffe6ee]'
            )}
          >
            {environmentLabel}
          </span>
          <span className={badgeClasses}>Dev / Lab</span>
          <span className="hidden rounded-full bg-[rgba(17,26,47,0.6)] px-2 py-1 text-[#c3cce5] sm:inline">
            Not user-facing
          </span>
        </div>
        <p className="text-xs text-[#c3cce5]">Signed in as {userEmail}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm text-[#dbe4ff]">
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
