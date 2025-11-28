import type { JSX } from 'react';
import { prisma } from '@/lib/prisma';
import { getCurrentUserIdOrRedirect } from '@/lib/auth';
import { getUnifiedActivityForUser } from '@/lib/unified-activity';
import ActivityPageClient from './client';

export default async function ActivityPage(): Promise<JSX.Element> {
  const userId = await getCurrentUserIdOrRedirect('/activity');
  const [initialRows, cards] = await Promise.all([
    getUnifiedActivityForUser(userId, { limit: 500 }),
    prisma.card.findMany({
      where: { userId },
      select: { id: true, nickname: true, network: true },
      orderBy: { nickname: 'asc' },
    }),
  ]);

  return (
    <main className="flex-1 overflow-y-auto px-6 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-label text-pink-200">Activity</p>
          <h1 className="text-3xl font-semibold text-white">All Activity</h1>
          <p className="text-slate-300">
            Unified timeline of real transactions, simulations, and points. Refine with filters
            instead of jumping between pages.
          </p>
        </header>

        <ActivityPageClient initialRows={initialRows} cards={cards} />
      </div>
    </main>
  );
}
