import type { JSX, ReactNode } from 'react';
import UserNavClient from './UserNavClient';
import { cherryTextClasses } from '@/lib/ui/theme';
import { cn } from '@/lib/ui/cn';

export default function UserLayout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="min-h-screen bg-gradient-to-br from-ink-950 via-ink-900 to-ink-950 text-cloud-50">
      <header className="border-b border-ink-800/70 bg-ink-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cherry-500 text-sm font-semibold text-ink-950 shadow-card">
              C
            </div>
            <div className="leading-tight">
              <p className="text-[11px] font-semibold uppercase tracking-label text-cherry-100">
                Cherry
              </p>
              <p className="text-base font-semibold text-cloud-50">Your spending copilot</p>
            </div>
          </div>

          <UserNavClient />
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 py-8">
        <div className={cn('space-y-6', cherryTextClasses.bright)}>{children}</div>
      </main>
    </div>
  );
}
