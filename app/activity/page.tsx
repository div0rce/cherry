import type { JSX } from 'react';
import { getCurrentUserIdOrRedirect } from '@/lib/auth';
import { getUnifiedActivityForUser } from '@/lib/unified-activity';
import ActivityPageClient from './client';

export default async function ActivityPage(): Promise<JSX.Element> {
  const userId = await getCurrentUserIdOrRedirect('/activity');
  const initialRows = await getUnifiedActivityForUser(userId, {
    limit: 200,
  });

  return (
    <main className="flex-1 overflow-y-auto px-6 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-label text-pink-200">Activity</p>
          <h1 className="text-3xl font-semibold text-white">All Accounts Activity</h1>
          <p className="text-slate-300">
            Real transactions and simulated events across all your connected accounts and Cherry
            tools.
          </p>
        </header>

        <ActivityPageClient initialRows={initialRows} />
      </div>
    </main>
  );
}
