import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
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

export default async function CardDetailPage({ params }: { params: Promise<{ cardId: string }> }) {
  const { cardId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect(`/signin?callbackUrl=${encodeURIComponent(`/cards/${cardId}`)}`);
  }

  const card = await prisma.card.findFirst({
    where: { id: cardId, userId: session.user.id },
    include: { rewardRules: true },
  });
  if (!card) return notFound();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-label text-pink-200">Card</p>
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
          <p className="text-sm text-slate-300">No rules yet. Add a category multiplier.</p>
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
        <Link href="/cards" className="hover:text-white">
          ← Back to cards
        </Link>
        <Link href="/simulate" className="hover:text-white">
          Run a simulation →
        </Link>
      </div>
    </div>
  );
}
