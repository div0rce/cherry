'use client';

import { useState, FormEvent } from 'react';
import { signIn } from 'next-auth/react';
import type { EngineDecision } from '@/lib/engine';

type ScanState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'recommended'; sessionId: string; decision: EngineDecision }
  | { status: 'confirming'; sessionId: string; decision: EngineDecision }
  | {
      status: 'claimed';
      pointsPending: number;
      decision: EngineDecision;
      sessionStatus: string;
      ledgerStatus: string;
      message?: string;
    };

type SessionResponse = {
  sessionId: string;
  decision: EngineDecision;
};

type ConfirmResponse = {
  sessionStatus: string;
  ledgerStatus: string;
  pointsPending: number;
  message?: string;
};

const inputClass =
  'w-full rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-pink-500 focus:outline-none';

export default function ScanClient() {
  const [merchantName, setMerchantName] = useState('');
  const [amountDollars, setAmountDollars] = useState('');
  const [category, setCategory] = useState('');
  const [state, setState] = useState<ScanState>({ status: 'idle' });
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setState({ status: 'idle' });
    setError(null);
    setMerchantName('');
    setAmountDollars('');
    setCategory('');
  };

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const parsedAmount = Number.parseFloat(amountDollars);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Enter an amount greater than 0.');
      return;
    }
    const amountCents = Math.round(parsedAmount * 100);

    setState({ status: 'submitting' });

    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchantName: merchantName.trim() || undefined,
        amountCents,
        category: category.trim() || undefined,
      }),
    });

    if (res.status === 401) {
      setState({ status: 'idle' });
      setError('Please sign in to scan.');
      void signIn(undefined, { callbackUrl: window.location.href });
      return;
    }

    if (!res.ok) {
      const message = await res.text();
      setState({ status: 'idle' });
      setError(message || 'Failed to create session');
      return;
    }

    const data = (await res.json()) as SessionResponse;
    setState({ status: 'recommended', sessionId: data.sessionId, decision: data.decision });
  }

  async function confirmSession(current: Extract<ScanState, { status: 'recommended' }>) {
    setState({ status: 'confirming', sessionId: current.sessionId, decision: current.decision });
    setError(null);

    const res = await fetch(`/api/sessions/${current.sessionId}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actualAmountCents: current.decision.amountCents,
        usedCardId: current.decision.card.cardId,
        followedRecommendation: true,
      }),
    });

    if (res.status === 401) {
      setError('Please sign in to confirm.');
      void signIn(undefined, { callbackUrl: window.location.href });
      setState({ status: 'recommended', sessionId: current.sessionId, decision: current.decision });
      return;
    }

    if (!res.ok) {
      const message = await res.text();
      setError(message || 'Failed to confirm session');
      setState({ status: 'recommended', sessionId: current.sessionId, decision: current.decision });
      return;
    }

    const data = (await res.json()) as ConfirmResponse;
    setState({
      status: 'claimed',
      pointsPending: data.pointsPending,
      decision: current.decision,
      sessionStatus: data.sessionStatus,
      ledgerStatus: data.ledgerStatus,
      message: data.message,
    });
  }

  function renderContent() {
    switch (state.status) {
      case 'idle':
      case 'submitting':
        return (
          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-2xl border border-white/5 bg-white/5 p-4 shadow-lg backdrop-blur"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-sm text-slate-300">Merchant name</span>
                <input
                  className={inputClass}
                  value={merchantName}
                  onChange={(e) => setMerchantName(e.target.value)}
                  placeholder="Cherry Coffee"
                  required
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm text-slate-300">Amount (USD)</span>
                <input
                  className={inputClass}
                  value={amountDollars}
                  onChange={(e) => setAmountDollars(e.target.value)}
                  placeholder="24.50"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm text-slate-300">Category (optional)</span>
                <input
                  className={inputClass}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="DINING"
                />
              </label>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={state.status === 'submitting'}
                className="rounded-md bg-pink-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-pink-400 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:ring-offset-2 focus:ring-offset-slate-900"
              >
                {state.status === 'submitting' ? 'Scanning…' : 'Scan before you pay'}
              </button>
              {error && <span className="text-sm text-red-300">{error}</span>}
            </div>
          </form>
        );
      case 'recommended': {
        const d = state.decision;
        return (
          <div className="space-y-4 rounded-2xl border border-white/5 bg-white/5 p-4 shadow-lg backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-label text-slate-400">Recommendation</p>
                <h2 className="text-xl font-semibold text-white">
                  {d.category} · ${(d.amountCents / 100).toFixed(2)} ·{' '}
                  {d.budget.name || 'No bucket'}
                </h2>
                <p className="text-sm text-slate-300">
                  {d.budget.verdict === 'BREAKS_BUDGET'
                    ? 'Over budget'
                    : d.budget.verdict === 'BORDERLINE'
                      ? 'Near your budget limit'
                      : d.budget.verdict === 'UNCONFIGURED'
                        ? 'No bucket configured; Cherry cannot assess budget.'
                        : d.budget.verdict === 'UNBOUNDED'
                          ? 'Unbudgeted by choice; optimizing rewards only.'
                          : 'Within budget'}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  d.overallVerdict === 'GREEN'
                    ? 'bg-emerald-500/20 text-emerald-100'
                    : d.overallVerdict === 'YELLOW'
                      ? 'bg-amber-500/20 text-amber-100'
                      : d.overallVerdict === 'RED'
                        ? 'bg-red-500/20 text-red-100'
                        : 'bg-slate-500/20 text-slate-100'
                }`}
              >
                {d.overallVerdict}
              </span>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-white/5 bg-slate-900/40 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">Card</p>
                <p className="text-sm text-white">{d.card.cardNickname ?? 'No card on file'}</p>
                {d.card.multiplier != null && (
                  <p className="text-xs text-slate-400">{d.card.multiplier}x rewards</p>
                )}
                {d.card.verdict === 'NO_CARD_DATA' && (
                  <p className="text-xs text-amber-200">No card data to optimize rewards.</p>
                )}
              </div>
              <div className="rounded-lg border border-white/5 bg-slate-900/40 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">Bucket impact</p>
                <p className="text-sm text-white">
                  {d.budget.remainingAfterCents != null
                    ? `Remaining ${(d.budget.remainingAfterCents / 100).toFixed(2)}`
                    : 'No bucket'}
                </p>
                {d.budget.spentAfterCents != null && d.budget.limitCents != null && (
                  <p className="text-xs text-slate-400">
                    {(d.budget.spentAfterCents / 100).toFixed(2)} /{' '}
                    {(d.budget.limitCents / 100).toFixed(2)}
                  </p>
                )}
                {d.budget.verdict === 'UNCONFIGURED' && (
                  <p className="text-xs text-amber-200">
                    Create a bucket to track this category and get budget verdicts.
                  </p>
                )}
                {d.budget.verdict === 'UNBOUNDED' && (
                  <p className="text-xs text-slate-300">
                    Unbudgeted by choice; Cherry will focus on card optimization only.
                  </p>
                )}
              </div>
              <div className="rounded-lg border border-white/5 bg-slate-900/40 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">Cherry Points</p>
                <p className="text-sm text-white">
                  {d.cherryIncentive.pointsIfFollowed} pts if followed
                </p>
                <p className="text-xs text-slate-400">Expires in {d.cherryIncentive.expiryMinutes} min</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => confirmSession(state)}
                className="rounded-md bg-pink-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:ring-offset-2 focus:ring-offset-slate-900"
              >
                I used this card
              </button>
              <button
                type="button"
                onClick={reset}
                className="rounded-md border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/5"
              >
                Dismiss
              </button>
              {error && <span className="text-sm text-red-300">{error}</span>}
            </div>
          </div>
        );
      }
      case 'confirming':
        return (
          <div className="rounded-2xl border border-white/5 bg-white/5 p-4 shadow-lg text-slate-100">
            <p className="text-sm">Confirming your session…</p>
          </div>
        );
      case 'claimed':
        return (
          <div className="space-y-3 rounded-2xl border border-white/5 bg-white/5 p-4 shadow-lg text-slate-100">
            <p className="text-xs uppercase tracking-label text-pink-200">Claim submitted</p>
            <p className="text-lg font-semibold text-white">
              {state.pointsPending} Cherry Points pending verification.
            </p>
            <p className="text-sm text-slate-300">
              Session: {state.sessionStatus} · Ledger: {state.ledgerStatus}
            </p>
            <p className="text-sm text-slate-400">
              {state.message ?? 'Points will post after verification. Pending points are not yet in your balance.'}
            </p>
            <button
              type="button"
              onClick={reset}
              className="inline-flex rounded-md bg-pink-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              New scan
            </button>
          </div>
        );
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6 text-slate-100">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-label text-pink-200">Cherry</p>
        <h1 className="text-3xl font-semibold text-white">Scan before you pay</h1>
        <p className="text-slate-300">
          Start a recommendation session, see the best card, and confirm to earn Cherry Points.
        </p>
      </header>

      {renderContent()}
    </div>
  );
}
