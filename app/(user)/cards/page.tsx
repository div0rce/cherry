import type { JSX } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { getCurrentUserIdOrRedirect } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { CardsClient } from './CardsClient';
import type { CardListItem } from './card-types';

export default async function UserCardsPage(): Promise<JSX.Element> {
  const userId = await getCurrentUserIdOrRedirect('/cards');

  let cards: CardListItem[] = [];
  let error: string | null = null;

  try {
    cards = await prisma.card.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        nickname: true,
        network: true,
        issuer: true,
        isCredit: true,
        annualFee: true,
      },
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

      <CardsClient initialCards={cards} initialError={error} />
    </div>
  );
}
