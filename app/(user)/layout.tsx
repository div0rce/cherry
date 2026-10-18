import type { JSX, ReactNode } from 'react';
import { auth } from '../../lib/auth.js';
import { UserBottomNav } from '../../components/user/UserBottomNav.js';
import { SignOutButton } from '../../components/user/SignOutButton.js';
export const dynamic = 'force-dynamic';

export default async function UserLayout({ children }: { children: ReactNode }): Promise<JSX.Element> {
  const session = await auth();
  const email = session?.user?.email ?? null;
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>
      {email !== null ? (
        <div className="mx-auto flex max-w-5xl items-center justify-end gap-3 px-4 pt-4 text-xs text-slate-600 sm:px-6 lg:px-8">
          <span>
            Signed in as <span className="font-semibold text-slate-800">{email}</span>
          </span>
          <SignOutButton />
        </div>
      ) : null}
      <main id="main" className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 pb-24 pt-6 sm:px-6 lg:px-8">
        {children}
      </main>
      <UserBottomNav />
    </div>
  );
}
