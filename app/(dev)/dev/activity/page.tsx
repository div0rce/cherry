import type { JSX } from 'react';
import { prisma } from '@/lib/prisma';
import { getCurrentUserIdOrRedirect } from '@/lib/auth';
import { getDevActivityEvents } from '@/lib/unified-activity';
import { ROUTES } from '@/lib/routes';
import ActivityPageClient from '@/app/(dev)/activity/client';

export default async function DevActivityPage(): Promise<JSX.Element> {
  const userId = await getCurrentUserIdOrRedirect(ROUTES.dev.activity);
  const [initialRows, cards] = await Promise.all([
    getDevActivityEvents(userId),
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
          <p className="text-xs uppercase tracking-label text-pink-200">Dev Tools</p>
          <h1 className="text-3xl font-semibold text-white">Activity Inspector</h1>
          <p className="text-slate-300">
            Unified timeline of real, simulated, and points events for debugging Cherry&apos;s event
            pipeline. This is a developer-only surface.
          </p>
          <p className="text-xs text-amber-300">
            Note: Includes simulated/test data (Manual, Vine, bank-sim). Do not expose to end users.
          </p>
        </header>

        <ActivityPageClient initialRows={initialRows} cards={cards} />
      </div>
    </main>
  );
}
