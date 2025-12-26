import { Suspense } from 'react';
import type { JSX } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PageHeader } from '../../../../components/ui/page-header.js';
import { MetricCard } from '../../../../components/ui/metric-card.js';
import { Panel } from '../../../../components/ui/panel.js';
import { EmptyState } from '../../../../components/ui/empty-state.js';
import { LoadingRows } from '../../../../components/ui/loading-skeleton.js';
import { ErrorBanner } from '../../../../components/ErrorBanner.js';
import {
  AddCardForm,
  AddRewardRuleForm,
  DeleteCardButton,
  DeleteRewardRuleButton,
} from './client.js';
import { getCurrentUserId } from '../../../../lib/auth.js';
import { ROUTES } from '../../../../lib/routes.js';
import { fetchApiResult } from '../../../../lib/api/fetch-json.js';
import type { ApiResult } from '../../../../lib/api/result.js';

const hasText = (value?: string | null): value is string =>
  value !== undefined && value !== null && value !== '';

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

async function fetchCards(): Promise<ApiResult<Card[]>> {
  return fetchApiResult<Card[]>('/api/cards', { cache: 'no-store' });
}

export default async function CardsPage(): Promise<JSX.Element | null> {
  try {
    await getCurrentUserId();
  } catch (_error: unknown) {
    redirect(`/signin?callbackUrl=${encodeURIComponent(ROUTES.dev.cards)}`);
  }

  let cards: Card[] = [];
  let error: string | null = null;

  const cardsResult = await fetchCards();
  if (!cardsResult.ok) {
    if (cardsResult.error === 'UNAUTHORIZED') {
      redirect(`/signin?callbackUrl=${encodeURIComponent(ROUTES.dev.cards)}`);
      return null;
    }
    error = cardsResult.message;
  } else {
    cards = cardsResult.data;
  }

  const totalRewardRules = cards.reduce((sum, card) => sum + card.rewardRules.length, 0);

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 text-slate-100">
      <PageHeader
        title="Cards & rewards"
        label="Setup"
        description="View and manage cards Cherry can recommend and simulate against."
        actions={
          <div className="flex items-center gap-3 text-sm">
            <Link href={ROUTES.dev.buckets} className="text-pink-200 hover:text-pink-100">
              Buckets →
            </Link>
            <Link href="/simulate" className="text-pink-200 hover:text-pink-100">
              Simulations →
            </Link>
          </div>
        }
      />

      <section className="grid gap-3 md:grid-cols-3">
        <MetricCard label="Cards" value={cards.length} helper="Active in engine" />
        <MetricCard label="Reward rules" value={totalRewardRules} helper="Across all cards" />
        <MetricCard
          label="Credit vs debit"
          value={`${cards.filter((c) => c.isCredit).length} credit / ${cards.filter((c) => !c.isCredit).length} debit`}
          helper="By card type"
        />
      </section>

      <div className="grid gap-6 md:grid-cols-[2fr,1fr]">
        <Panel
          title="Your cards"
          description="Cards and reward rules used by the engine and simulations."
        >
          {hasText(error) ? (
            <ErrorBanner message="Failed to load cards." />
          ) : (
            <Suspense
              fallback={
                <div className="p-2">
                  <LoadingRows rows={4} columns={1} />
                </div>
              }
            >
              <CardList cards={cards} />
            </Suspense>
          )}
        </Panel>

        <Panel
          title="Add a card"
          description="Annual fee is optional; enter it in dollars (we convert to cents)."
        >
          <AddCardForm />
        </Panel>
      </div>
    </div>
  );
}

function CardList({ cards }: { cards: Card[] }) {
  if (cards.length === 0) {
    return (
      <div className="p-4">
        <EmptyState
          title="No cards yet"
          description="Add your cards so the engine can recommend them in simulations and scans."
        />
      </div>
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
              <EmptyState
                title="No rules yet"
                description="Add a category multiplier so Cherry can compute rewards for this card."
              />
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
