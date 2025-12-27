import type { JSX } from 'react';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUserId } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';
import { ROUTES } from '../../../../../lib/routes';
import Link from 'next/link';
import { EmptyState } from '../../../../../components/ui/empty-state';
import { AddRewardRuleForm, DeleteCardButton, DeleteRewardRuleButton } from '../client';

function formatCents(cents: number | null) {
  if (cents == null) return '—';
  return `$${(cents / 100).toFixed(2)}`;
}

function formatRuleDisplay(multiplier: number) {
  if (multiplier < 1) return `${(multiplier * 100).toFixed(2)}% cash back`;
  if (multiplier === 1) return '1x points';
  return `${multiplier}x points`;
}

export default async function CardDetailPage({
  params,
}: {
  params: Promise<{ cardId: string }>;
}): Promise<JSX.Element | null> {
  const { cardId } = await params;
  let userId: string;
  try {
    userId = await getCurrentUserId();
  } catch (error: unknown) {
    void error;
    redirect(`/signin?callbackUrl=${encodeURIComponent(`${ROUTES.dev.cards}/${cardId}`)}`);
    return null;
  }

  const card = await prisma.card.findFirst({
    where: { id: cardId, userId },
    include: { rewardRules: true },
  });
  if (card === null) return notFound();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-pink-200">Card</p>
          <h1 className="text-3xl font-semibold text-white">{card.nickname}</h1>
          <p className="text-slate-300">
            {card.issuer} · {card.network} · {card.isCredit ? 'Credit' : 'Debit'} · Annual fee:{' '}
            {formatCents(card.annualFee)}
          </p>
        </div>
        <DeleteCardButton cardId={card.id} />
      </header>

      <section className="rounded-2xl border border-white/5 bg-white/5 p-4 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Reward Rules</h2>
          <AddRewardRuleForm cardId={card.id} />
        </div>
        {card.rewardRules.length === 0 ? (
          <EmptyState
            title="No rules yet"
            description="Add a category multiplier so Cherry can compute rewards for this card."
          />
        ) : (
          <ul className="divide-y divide-white/5">
            {card.rewardRules.map((rule) => (
              <li key={rule.id} className="py-2 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">
                    {rule.category} · {formatRuleDisplay(rule.multiplier ?? 1)}
                  </p>
                  <p className="text-xs text-slate-400">
                    Credit limit:{' '}
                    {rule.capAmount != null ? formatCents(rule.capAmount) : 'No limit'}
                  </p>
                </div>
                <DeleteRewardRuleButton cardId={card.id} rewardRuleId={rule.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex items-center gap-3 text-sm text-pink-200">
        <Link href={ROUTES.dev.cards} className="hover:text-white">
          ← Back to cards
        </Link>
        <Link href="/simulate" className="hover:text-white">
          Run a simulation →
        </Link>
      </div>
    </div>
  );
}
