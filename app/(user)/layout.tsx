import type { JSX, ReactNode } from 'react';
import { UserBottomNav } from '@/components/user/UserBottomNav';
export const dynamic = 'force-dynamic';



export default function UserLayout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 pb-24 pt-6 sm:px-6 lg:px-8">
        {children}
      </div>
      <UserBottomNav />
    </div>
  );
}
