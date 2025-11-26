import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import {
  AddCardForm,
  AddRewardRuleForm,
  DeleteCardButton,
  DeleteRewardRuleButton,
} from './client';
import { getBaseUrl } from '@/lib/base-url';

type RewardRule = {
  id: string;
  category: string;
  multiplier: number | null;
  cashbackPercent: number | null;
  capAmount: number | null;
  createdAt: string;
  updatedAt: string;
};

type Card = {
  id: string;
  nickname: string;
  issuer: string;
  network: string;
  isCredit: boolean;
  annualFee: number | null;
  createdAt: string;
  updatedAt: string;
  rewardRules: RewardRule[];
};

function formatCents(cents: number | null | undefined) {
  if (cents == null) return '—';
  return `$${(cents / 100).toFixed(2)}`;
}

function formatRuleDisplay(rule: RewardRule) {
  if (rule.cashbackPercent != null) {
    return `${rule.cashbackPercent}% cash back`;
  }

  if (rule.multiplier == null) {
    return 'Custom reward';
  }

  const multiplier = rule.multiplier;
  // Inference rules:
  // - multiplier < 1: treat as cash-back decimal (0.025 -> 2.5% cash back)
  // - multiplier === 1: base earn; show as 1x points
  // - multiplier > 1: points earn rate (e.g., 3x points)
  if (multiplier < 1) {
    return `${(multiplier * 100).toFixed(2)}% cash back`;
  }
  if (multiplier === 1) {
    return '1x points';
  }
  return `${multiplier}x points`;
}

async function fetchCards(): Promise<Card[]> {
  const baseUrl = getBaseUrl();
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const res = await fetch(`${baseUrl}/api/cards`, {
    cache: 'no-store',
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || 'Failed to load cards');
  }

  return res.json();
}

export default async function CardsPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect(`/signin?callbackUrl=${encodeURIComponent('/cards')}`);
  }

  let cards: Card[] = [];
  let error: string | null = null;

  try {
    cards = await fetchCards();
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load cards';
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-8 text-slate-100">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.2em] text-pink-200">Cherry Lab</p>
        <h1 className="text-3xl font-semibold text-white">Cards & Rewards</h1>
        <p className="text-slate-300">
          Manage demo cards and reward rules. Data comes from the Prisma-backed APIs.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-[2fr,1fr]">
        <section className="space-y-4">
          <div className="rounded-2xl border border-white/5 bg-white/5 shadow-lg backdrop-blur">
            <div className="border-b border-white/5 px-4 py-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Your cards</h2>
              <div className="flex items-center gap-4 text-sm text-pink-200">
                <Link href="/buckets" className="hover:text-white">
                  Buckets →
                </Link>
                <Link href="/simulate" className="hover:text-white">
                  Simulations →
                </Link>
              </div>
            </div>

            {error ? (
              <div className="p-4 text-sm text-red-300">{error}</div>
            ) : (
              <Suspense fallback={<div className="p-4 text-sm text-slate-300">Loading…</div>}>
                <CardList cards={cards} />
              </Suspense>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-white/5 bg-white/5 shadow-lg backdrop-blur p-4">
            <h3 className="text-base font-semibold mb-2 text-white">Add a card</h3>
            <p className="text-sm text-slate-300 mb-3">
              Annual fee is optional; enter it in dollars (we convert to cents).
            </p>
            <AddCardForm />
          </div>
        </section>
      </div>
    </div>
  );
}

function CardList({ cards }: { cards: Card[] }) {
  if (!cards.length) {
    return (
      <div className="p-4 text-sm text-slate-300">No cards yet. Add one to get started.</div>
    );
  }

  return (
    <ul className="divide-y divide-white/5">
      {cards.map((card) => (
        <li key={card.id} className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-white">{card.nickname}</p>
              <p className="text-sm text-slate-300">
                {card.issuer} · {card.network} · {card.isCredit ? 'Credit' : 'Debit'}
              </p>
              <p className="text-sm text-slate-400">Annual fee: {formatCents(card.annualFee)}</p>
            </div>
            <div className="flex items-center gap-2">
              <DeleteCardButton cardId={card.id} />
            </div>
          </div>

          <div className="rounded-lg border border-white/5 bg-slate-900/50 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Reward rules</p>
              <AddRewardRuleForm cardId={card.id} />
            </div>
            {card.rewardRules.length === 0 ? (
              <p className="text-sm text-slate-300">No rules yet. Add a category multiplier.</p>
            ) : (
              <ul className="space-y-2">
                {card.rewardRules.map((rule) => (
                  <li
                    key={rule.id}
                    className="flex items-center justify-between rounded-md bg-slate-800/80 px-3 py-2 shadow-sm"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {rule.category} · {formatRuleDisplay(rule)}
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
          </div>
        </li>
      ))}
    </ul>
  );
}
