'use client';

import type { FormEvent, JSX } from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card as UiCard } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Toggle } from '@/components/ui/Toggle';
import { Badge } from '@/components/ui/Badge';
import type { CardListItem } from './card-types';

const hasText = (value?: string | null): value is string =>
  value !== undefined && value !== null && value.trim() !== '';

function formatAnnualFee(annualFee: number | null): string {
  if (annualFee === null || Number.isNaN(annualFee)) return 'No annual fee';
  const dollars = (annualFee / 100).toFixed(2);
  return `$${dollars}`;
}

function normalizeCard(card: {
  id: string;
  nickname: string;
  issuer: string;
  network: string;
  isCredit: boolean;
  annualFee: number | null;
}): CardListItem {
  return {
    id: card.id,
    nickname: card.nickname,
    issuer: card.issuer,
    network: card.network,
    isCredit: card.isCredit,
    annualFee: card.annualFee ?? null,
  };
}

type CardsClientProps = {
  initialCards: CardListItem[];
  initialError: string | null;
};

export function CardsClient({ initialCards, initialError }: CardsClientProps): JSX.Element {
  const [cards, setCards] = useState<CardListItem[]>(initialCards);
  const [error, setError] = useState<string | null>(initialError);
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nickname, setNickname] = useState('');
  const [issuer, setIssuer] = useState('');
  const [network, setNetwork] = useState('VISA');
  const [annualFeeDollars, setAnnualFeeDollars] = useState('');
  const [isCredit, setIsCredit] = useState(true);

  const hasCards = cards.length > 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setStatus(null);
    setError(null);

    const nicknameTrimmed = nickname.trim();
    const issuerTrimmed = issuer.trim();
    const networkTrimmed = network.trim();

    if (!hasText(nicknameTrimmed) || !hasText(issuerTrimmed) || !hasText(networkTrimmed)) {
      setError('Nickname, issuer, and network are required.');
      return;
    }

    if (annualFeeDollars.trim() !== '') {
      const parsed = Number.parseFloat(annualFeeDollars);
      if (!Number.isFinite(parsed) || parsed < 0) {
        setError('Annual fee must be a non-negative number.');
        return;
      }
    }

    const annualFeeCents =
      annualFeeDollars.trim() === ''
        ? null
        : Math.round(Number.parseFloat(annualFeeDollars) * 100);

    setIsSubmitting(true);
    setStatus('Saving your card…');

    try {
      const response = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname: nicknameTrimmed,
          issuer: issuerTrimmed,
          network: networkTrimmed,
          isCredit,
          annualFee: annualFeeCents,
        }),
      });

      if (response.status === 401) {
        setError('Your session expired. Please sign in again.');
        setStatus(null);
        return;
      }

      if (!response.ok) {
        const message = (await response.text()).trim();
        setError(hasText(message) ? message : 'Failed to save card.');
        setStatus(null);
        return;
      }

      const createdCard = normalizeCard(await response.json());
      setCards((prev) => [createdCard, ...prev]);

      setNickname('');
      setIssuer('');
      setNetwork('VISA');
      setAnnualFeeDollars('');
      setIsCredit(true);
      setStatus('Saved. Cherry will use this card for recommendations.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error while saving your card.';
      setError(message);
      setStatus(null);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <ErrorBanner message={error} />

      <UiCard tone="base" padding="lg" className="border border-ink-700/60 shadow-sm">
        <div className="flex flex-col gap-2">
          <div>
            <p className="text-lg font-semibold text-cloud-50">Add a card or debit account</p>
            <p className="text-sm text-cloud-300">
              Share the basics so Cherry can compare rewards and runway. We only use these details to advise—never to process
              payments.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-3 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm text-cloud-200">
                <span className="font-medium">Nickname</span>
                <Input
                  name="nickname"
                  placeholder="Amex Gold"
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                  required
                />
              </label>
              <label className="space-y-1 text-sm text-cloud-200">
                <span className="font-medium">Issuer</span>
                <Input
                  name="issuer"
                  placeholder="AMEX"
                  value={issuer}
                  onChange={(event) => setIssuer(event.target.value)}
                  required
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm text-cloud-200">
                <span className="font-medium">Network</span>
                <Select
                  name="network"
                  value={network}
                  onChange={(event) => setNetwork(event.target.value)}
                  required
                  className="bg-cherry-bg"
                >
                  <option value="VISA">VISA</option>
                  <option value="MASTERCARD">MASTERCARD</option>
                  <option value="AMEX">AMEX</option>
                  <option value="DISCOVER">DISCOVER</option>
                  <option value="OTHER">OTHER</option>
                </Select>
              </label>
              <label className="space-y-1 text-sm text-cloud-200">
                <span className="font-medium">Annual fee (USD)</span>
                <Input
                  name="annualFee"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="250.00"
                  value={annualFeeDollars}
                  onChange={(event) => setAnnualFeeDollars(event.target.value)}
                />
                <p className="text-xs text-cloud-400">Leave empty if this card has no annual fee.</p>
              </label>
            </div>

            <div className="flex items-center justify-between rounded-md border border-ink-700/60 bg-ink-800/60 px-3 py-2">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-cloud-100">Card type</p>
                <p className="text-xs text-cloud-300">Tell Cherry whether this is credit or debit for safer advice.</p>
              </div>
              <Toggle
                label={isCredit ? 'Credit' : 'Debit'}
                checked={isCredit}
                onCheckedChange={(checked) => setIsCredit(Boolean(checked))}
                aria-label="Toggle between credit and debit"
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-cloud-400">
                You can add rewards later in the dev console. For now, Cherry will still compare this card when recommending.
              </p>
              <Button type="submit" disabled={isSubmitting} variant="primary">
                {isSubmitting ? 'Saving…' : 'Save card'}
              </Button>
            </div>
            {hasText(status) ? <p className="text-xs text-cloud-300">{status}</p> : null}
          </form>
        </div>
      </UiCard>

      {hasCards ? (
        <div className="space-y-3">
          {cards.map((card) => (
            <UiCard key={card.id} tone="base" padding="md" className="border border-ink-700/60">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-lg font-semibold text-cloud-50">{card.nickname}</p>
                  <p className="text-sm text-cloud-300">
                    Network: {hasText(card.network) ? card.network : 'Unknown'} · Issuer: {hasText(card.issuer) ? card.issuer : 'Unknown'}
                  </p>
                  <p className="text-xs text-cloud-400">{formatAnnualFee(card.annualFee)}</p>
                  <p className="text-xs text-cloud-400">Cherry will pick from this set for Autopilot.</p>
                </div>
                <Badge variant="outline" className="uppercase tracking-label text-cloud-100">
                  {card.isCredit ? 'Credit' : 'Debit'}
                </Badge>
              </div>
            </UiCard>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No cards yet"
          description="Add a card or debit so Cherry can keep comparing rewards and budget guardrails."
        />
      )}
    </div>
  );
}
