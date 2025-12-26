import type { JSX } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { fetchFromApi, requireUserContext } from '@/app/(user)/_lib/api';
import { CardForm } from '../../../_components/CardForm';
import { DeleteActionButton } from '../../../_components/DeleteActionButton';
import { updateCard, deleteCard } from './actions';
export const dynamic = 'force-dynamic';



type PageParams = { cardId: string };

export default async function EditCardPage({
  params,
}: {
  params: Promise<PageParams> | PageParams;
}): Promise<JSX.Element | null> {
  const resolvedParams = params instanceof Promise ? await params : params;
  const { cardId } = resolvedParams;
  await requireUserContext();
  const response = await fetchFromApi('/api/cards');
  if (!response.ok) {
    redirect('/app/onboarding?missing=cards');
    return null;
  }
  const cards = (await response.json()) as Array<{
    id: string;
    nickname: string;
    issuer: string;
    network: string;
    isCredit: boolean;
    annualFee: number | null;
  }>;
  const currentCard = cards.find((item) => item.id === cardId) ?? null;
  if (currentCard === null) {
    redirect('/app/onboarding?missing=cards');
    return null;
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#f8fafc] to-[#e2e8f0]">
      <div className="mx-auto max-w-3xl px-4 py-10 space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#ff4d6d]">Cards</p>
            <h1 className="text-2xl font-semibold text-[#0f172a]">Edit card</h1>
            <p className="text-sm text-slate-600">
              Update display details or remove the card. Deleting cascades its reward rules.
            </p>
          </div>
          <Link href="/app/onboarding" className="text-sm font-semibold text-[#ff4d6d]">
            ← Back to onboarding
          </Link>
        </div>

        <CardForm
          action={updateCard}
          defaultValues={{
            cardId: currentCard.id,
            nickname: currentCard.nickname,
            issuer: currentCard.issuer,
            network: currentCard.network,
            isCredit: currentCard.isCredit,
            annualFeeCents: currentCard.annualFee ?? null,
          }}
          submitLabel="Save changes"
          footerSlot={
            <DeleteActionButton
              action={deleteCard}
              hiddenFields={{ cardId: currentCard.id }}
              label="Delete card"
            />
          }
        />
      </div>
    </main>
  );
}
