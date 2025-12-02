import type { JSX, ReactNode } from 'react';
import Link from 'next/link';
import { UserMenu } from './user-menu';

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
    <header className="flex flex-col gap-3 border-b border-white/5 bg-slate-900/70 px-6 py-4 backdrop-blur md:flex-row md:items-center md:justify-between">
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-label text-pink-200">
        <span className="rounded-full bg-pink-600/20 px-2 py-1 text-pink-100">{environmentLabel}</span>
        <span className="hidden sm:inline text-slate-400">Cherry Dev Console</span>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-200">
        <Link
          href="/scan"
          className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-semibold text-slate-100 hover:border-pink-500/30 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-300"
        >
          Scan
        </Link>
        <Link
          href="/simulate"
          className="rounded-md border border-pink-500/40 bg-pink-600/20 px-3 py-1.5 text-sm font-semibold text-pink-100 hover:bg-pink-600/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-300"
        >
          Simulate
        </Link>
        {actions}
        <UserMenu email={userEmail} />
      </div>
    </header>
  );
}
