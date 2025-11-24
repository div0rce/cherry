import { Suspense } from 'react';
import Link from 'next/link';
import {
  AddCardForm,
  AddRewardRuleForm,
  DeleteCardButton,
  DeleteRewardRuleButton,
} from './client';

type RewardRule = {
  id: string;
  category: string;
  multiplier: number;
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

function formatRuleDisplay(multiplier: number) {
  // Inference rules:
  // - multiplier < 1: treat as cash-back decimal (0.025 -> 2.5% cash back)
  // - multiplier === 1: base earn; show as 1× points
  // - multiplier > 1: points earn rate (e.g., 3× points)
  if (multiplier < 1) {
    return `${(multiplier * 100).toFixed(2)}% cash back`;
  }
  if (multiplier === 1) {
    return '1× points';
  }
  return `${multiplier}× points`;
}

async function fetchCards(): Promise<Card[]> {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : 'http://localhost:3000');

  const res = await fetch(`${base}/api/cards`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || 'Failed to load cards');
  }

  return res.json();
}

export default async function CardsPage() {
  let cards: Card[] = [];
  let error: string | null = null;

  try {
    cards = await fetchCards();
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load cards';
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Cherry Lab</p>
        <h1 className="text-3xl font-semibold">Cards & Rewards</h1>
        <p className="text-slate-500">
          Manage demo cards and reward rules. Data comes from the Prisma-backed APIs.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-[2fr,1fr]">
        <section className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white/60 shadow-sm backdrop-blur">
            <div className="border-b border-slate-200 px-4 py-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Your cards</h2>
              <div className="flex items-center gap-4 text-sm">
                <Link href="/buckets" className="text-blue-600 hover:text-blue-700">
                  Buckets →
                </Link>
                <Link href="/simulate" className="text-blue-600 hover:text-blue-700">
                  Simulations →
                </Link>
              </div>
            </div>

            {error ? (
              <div className="p-4 text-sm text-red-600">{error}</div>
            ) : (
              <Suspense fallback={<div className="p-4 text-sm text-slate-500">Loading…</div>}>
                <CardList cards={cards} />
              </Suspense>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white/60 shadow-sm backdrop-blur p-4">
            <h3 className="text-base font-semibold mb-2">Add a card</h3>
            <p className="text-sm text-slate-500 mb-3">
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
    return <div className="p-4 text-sm text-slate-500">No cards yet. Add one to get started.</div>;
  }

  return (
    <ul className="divide-y divide-slate-200">
      {cards.map((card) => (
        <li key={card.id} className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-semibold">{card.nickname}</p>
              <p className="text-sm text-slate-500">
                {card.issuer} · {card.network} · {card.isCredit ? 'Credit' : 'Debit'}
              </p>
              <p className="text-sm text-slate-500">
                Annual fee: {formatCents(card.annualFee)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <DeleteCardButton cardId={card.id} />
            </div>
          </div>

          <div className="rounded-lg border border-slate-900 bg-slate-50/80 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">Reward rules</p>
              <AddRewardRuleForm cardId={card.id} />
            </div>
            {card.rewardRules.length === 0 ? (
              <p className="text-sm text-slate-900">No rules yet. Add a category multiplier.</p>
            ) : (
              <ul className="space-y-2">
                {card.rewardRules.map((rule) => (
                  <li
                    key={rule.id}
                    className="flex items-center justify-between rounded-md bg-white px-3 py-2 shadow-sm"
                  >
                    <div>
                      <p className="text-sm font-semibold">
                        {rule.category} · {formatRuleDisplay(rule.multiplier)}
                      </p>
                      <p className="text-xs text-slate-500">
                        Cap: {rule.capAmount != null ? formatCents(rule.capAmount) : 'No cap'}
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
