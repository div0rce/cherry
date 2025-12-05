import type { JSX } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card as UiCard } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorBanner } from '@/components/ErrorBanner';
import { getCurrentUserIdOrRedirect } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export default async function UserCardsPage(): Promise<JSX.Element> {
  const userId = await getCurrentUserIdOrRedirect('/cards');

  let cards:
    | {
        id: string;
        nickname: string;
        network: string;
        issuer: string;
      }[]
    | null = null;
  let error: string | null = null;

  try {
    cards = await prisma.card.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, nickname: true, network: true, issuer: true },
    });
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load cards';
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 space-y-6">
      <PageHeader
        title="Cards"
        description="These are the cards Cherry chooses from when finding the best option."
      />

      {error !== null ? (
        <ErrorBanner message={error} />
      ) : cards === null || cards.length === 0 ? (
        <EmptyState title="No cards" description="Add cards in the dev console to get started." />
      ) : (
        <div className="space-y-3">
          {cards.map((card) => (
            <UiCard key={card.id} tone="base" padding="md" className="border border-ink-700/60">
              <p className="text-lg font-semibold text-cloud-50">{card.nickname}</p>
              <p className="text-sm text-cloud-300">
                Network: {card.network !== null ? card.network : 'Unknown'} · Issuer:{' '}
                {card.issuer !== null ? card.issuer : 'Unknown'}
              </p>
              <p className="text-xs text-cloud-400">Cherry will pick from this set for Autopilot.</p>
            </UiCard>
          ))}
        </div>
      )}
    </div>
  );
}
