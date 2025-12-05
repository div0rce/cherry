"use client";

import type { JSX } from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingRows } from '@/components/ui/loading-skeleton';
import { ErrorBanner } from '@/components/ErrorBanner';

type Decision = {
  id: string;
  actionType: string;
  cardId: string | null;
  score: number;
  constraintsBreached: string[];
};

type InspectResponse = {
  decisions: Decision[];
  guardrails: string[];
  topDecision: Decision | null;
  error?: string;
};

const inputClasses =
  'w-full rounded-lg border border-ink-700/60 bg-ink-900/70 px-3 py-2 text-cloud-50 placeholder-cloud-400 shadow-soft focus:border-cherry-400 focus:outline-none focus:ring-2 focus:ring-cherry-400/60';

export default function InspectorClient(): JSX.Element {
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [result, setResult] = useState<InspectResponse | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'ready'>('idle');
  const [error, setError] = useState<string | null>(null);

  const isLoading = status === 'loading';

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('loading');
    setError(null);
    setResult(null);

    const amountNumber = Number.parseFloat(amount);
    if (merchant.trim().length === 0 || !Number.isFinite(amountNumber) || amountNumber <= 0) {
      setError('Merchant and positive amount are required.');
      setStatus('error');
      return;
    }

    try {
      const res = await fetch('/api/dev/engine/inspect', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          merchant: merchant.trim(),
          amount: amountNumber,
          category: category.trim().length > 0 ? category.trim() : undefined,
        }),
      });

      const payload = (await res.json()) as InspectResponse & { error?: string };
      if (!res.ok) {
        throw new Error(payload.error ?? 'Engine inspector failed');
      }

      setResult(payload);
      setStatus('ready');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Engine inspector failed';
      setError(message);
      setStatus('error');
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <label htmlFor="merchant" className="text-sm font-semibold text-cloud-200">
            Merchant
          </label>
          <input
            id="merchant"
            className={inputClasses}
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            placeholder="Coffee Bar"
            disabled={isLoading}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="amount" className="text-sm font-semibold text-cloud-200">
            Amount (USD)
          </label>
          <input
            id="amount"
            className={inputClasses}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="25.00"
            inputMode="decimal"
            disabled={isLoading}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="category" className="text-sm font-semibold text-cloud-200">
            Category (optional)
          </label>
          <input
            id="category"
            className={inputClasses}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="DINING"
            disabled={isLoading}
          />
        </div>
        <div className="md:col-span-2">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Running...' : 'Inspect decision'}
          </Button>
        </div>
      </form>

      {isLoading ? <LoadingRows rows={2} columns={2} /> : null}
      {error !== null ? <ErrorBanner message={error} /> : null}

      {status === 'ready' && result ? (
        <div className="space-y-4">
          <Card tone="base" padding="md" className="border border-ink-700/60">
            <p className="text-sm font-semibold text-cloud-50">Top decision</p>
            {result.topDecision ? (
              <div className="mt-2 space-y-1 text-sm text-cloud-200">
                <p>Action: {result.topDecision.actionType}</p>
                <p>Card: {result.topDecision.cardId ?? '—'}</p>
                <p>Score: {result.topDecision.score.toFixed(2)}</p>
                <p>
                  Guardrails:{' '}
                  {(result.topDecision.constraintsBreached ?? []).length > 0
                    ? result.topDecision.constraintsBreached.join(', ')
                    : 'None'}
                </p>
              </div>
            ) : (
              <EmptyState
                title="No decision"
                description="The engine did not return a recommendation for this input."
              />
            )}
          </Card>

          <Card tone="muted" padding="md" className="border border-ink-700/60">
            <p className="text-sm font-semibold text-cloud-50">Candidate actions</p>
            {result.decisions.length === 0 ? (
              <EmptyState title="No candidates" description="No actions were returned." />
            ) : (
              <div className="mt-3 space-y-2">
                {result.decisions.map((decision) => (
                  <div
                    key={decision.id}
                    className="rounded-lg border border-ink-800/60 bg-ink-900/70 p-3 text-sm text-cloud-100"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{decision.actionType}</span>
                      <span className="text-cloud-300">Score: {decision.score.toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-cloud-300">
                      Card: {decision.cardId ?? '—'} · Guardrails:{' '}
                      {decision.constraintsBreached.length > 0
                        ? decision.constraintsBreached.join(', ')
                        : 'None'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      ) : null}
    </div>
  );
}
