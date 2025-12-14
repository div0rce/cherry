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
    <div className="flex min-h-screen bg-[#05060f] text-[#f8fafc]">
      <SidebarNav />
      <div className="flex min-h-screen flex-1 flex-col bg-gradient-to-br from-[#05060f] via-[#0b1021] to-[#05060f]">
        <DevConsoleHeader userEmail={userEmail} />
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
