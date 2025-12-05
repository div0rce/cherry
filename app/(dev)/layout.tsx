import type { JSX, ReactNode } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { SidebarNav } from '@/components/sidebar-nav';
import { DevConsoleHeader } from '@/components/dev-console-header';

export default async function DevLayout({
  children,
}: {
  children: ReactNode;
}): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email ?? 'Not signed in';

  return (
    <div className="flex min-h-screen bg-ink-950 text-cloud-50">
      <SidebarNav />
      <div className="flex min-h-screen flex-1 flex-col bg-gradient-to-br from-ink-950 via-ink-900 to-ink-950">
        <DevConsoleHeader userEmail={userEmail} />
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
