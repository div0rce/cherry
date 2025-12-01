'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent, type JSX } from 'react';
import Link from 'next/link';
import type { EngineDecision } from '@/lib/engine';
import type { ScanResponse } from '@/lib/schemas/scan';
import { ScanResponseSchema } from '@/lib/schemas/scan';
import { callApi } from '@/lib/client/api';
import { useApiAction } from '@/lib/client/useApiAction';
import { ErrorBanner } from '@/components/ErrorBanner';
import { EmptyStateCard } from '@/components/empty-state-card';

type ScanPreview = {
  category: string | null;
  amountCents: number;
  merchantName: string | null;
  bucketName: string | null;
  bucketVerdict: string;
  bucketSpentCents: number | null;
  bucketBudgetCents: number | null;
  recommendedCardName: string | null;
  recommendedRewardLabel: string | null;
  advisoryPoints: number;
  isSnapshot: boolean;
  decision: EngineDecision;
};

type SessionState = {
  id: string;
  orderToken: string;
  expiresAt: string;
  pointsPending: number;
  pointsPosted: number;
  status: 'OPEN' | 'CLAIMED' | 'VERIFIED' | 'REJECTED' | 'EXPIRED' | 'UNKNOWN';
};

const inputClass =
  'w-full rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-pink-500 focus:outline-none';

function mapScanResponseToPreview(api: ScanResponse, request: { merchantName: string | null }): ScanPreview {
  const bucket = api.bucket ?? null;
  const isSnapshot = api.amountCents === 0;
  return {
    category: api.category ?? null,
    amountCents: api.amountCents,
    merchantName: api.merchantName ?? request.merchantName,
    bucketName: bucket?.name ?? null,
    bucketVerdict: bucket?.verdict ?? 'UNKNOWN',
    bucketSpentCents: bucket?.spentAfterCents ?? bucket?.spentBeforeCents ?? null,
    bucketBudgetCents: bucket?.limitCents ?? null,
    recommendedCardName: api.cardRecommendation.cardNickname ?? null,
    recommendedRewardLabel:
      api.cardRecommendation.rewardMultiplier != null
        ? `${api.cardRecommendation.rewardMultiplier}x rewards`
        : null,
    advisoryPoints: api.cherryIncentive.pointsIfFollowed ?? 0,
    isSnapshot,
    decision: api.engineDecision as EngineDecision,
  };
}

export default function ScanClient(): JSX.Element {
  const [merchantName, setMerchantName] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState('');
  const [scanPreview, setScanPreview] = useState<ScanPreview | null>(null);
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);
  const merchantInputRef = useRef<HTMLInputElement | null>(null);
  const { isLoading: isScanning, run: runScan } = useApiAction<ScanResponse>();

  const formattedCountdown = useMemo(() => {
    if (countdownSeconds == null) return '';
    const mins = Math.floor(countdownSeconds / 60);
    const secs = countdownSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, [countdownSeconds]);

  useEffect(() => {
    if (!sessionState || countdownSeconds == null) return;
    const id = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev == null) return prev;
        if (prev <= 1) {
          setSessionState((s) => (s ? { ...s, status: 'EXPIRED' } : s));
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [sessionState, countdownSeconds]);

  const reset = () => {
    setMerchantName('');
    setAmount('');
    setCategory('');
    setScanPreview(null);
    setSessionState(null);
    setCountdownSeconds(null);
    setError(null);
  };

  const focusMerchantField = () => {
    if (merchantInputRef.current) {
      merchantInputRef.current.focus();
      merchantInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setScanPreview(null);
    setSessionState(null);
    setCountdownSeconds(null);

    const parsedAmount = Number.parseFloat(amount || '0');
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      setError('Enter an amount of 0 or more.');
      return;
    }
    const expectedAmountCents = Math.round(parsedAmount * 100);

    const payload = {
      merchantName: merchantName.trim() || null,
      expectedAmountCents,
      category: category.trim() || null,
    };

    const result = await runScan(() =>
      callApi<ScanResponse>('/api/scan', {
        method: 'POST',
        body: JSON.stringify(payload),
        responseSchema: ScanResponseSchema,
      })
    );

    if (!result.ok) {
      setError(result.error);
      return;
    }

    const preview = mapScanResponseToPreview(result.data, payload);
    setScanPreview(preview);
  }

  async function startSession() {
    if (!scanPreview) return;
    setIsStartingSession(true);
    setError(null);

    try {
      const result = await callApi<{
        sessionId: string;
        orderToken: string;
        expiresAt: string;
      }>('/api/sessions', {
        method: 'POST',
        body: JSON.stringify({
          merchantName: scanPreview.merchantName ?? (merchantName.trim() || undefined),
          amountCents: scanPreview.amountCents,
          category: scanPreview.category ?? undefined,
        }),
      });

      if (!result.ok) {
        setError(result.error);
        setIsStartingSession(false);
        return;
      }

      const remainingSec = Math.max(
        0,
        Math.floor((new Date(result.data.expiresAt).getTime() - Date.now()) / 1000),
      );

      setSessionState({
        id: result.data.sessionId,
        orderToken: result.data.orderToken,
        expiresAt: result.data.expiresAt,
        pointsPending: scanPreview.advisoryPoints,
        pointsPosted: 0,
        status: 'OPEN',
      });
      setCountdownSeconds(remainingSec);
    } catch {
      setError('Failed to start session');
    } finally {
      setIsStartingSession(false);
    }
  }

  async function confirmSession() {
    if (!sessionState || !scanPreview) return;
    setIsConfirming(true);
    setError(null);
    try {
      const result = await callApi<{ sessionStatus: string; ledgerStatus: string }>(
        `/api/sessions/${sessionState.id}/confirm`,
        {
          method: 'POST',
          body: JSON.stringify({
            actualAmountCents: scanPreview.amountCents,
            usedCardId: scanPreview.decision.card.cardId,
            followedRecommendation: true,
          }),
        }
      );

      if (!result.ok) {
        setError(result.error);
        setIsConfirming(false);
        return;
      }

      setSessionState((prev) => (prev ? { ...prev, status: 'CLAIMED' } : prev));
    } catch {
      setError('Failed to confirm session');
    } finally {
      setIsConfirming(false);
    }
  }

  const formatCents = (cents: number | null | undefined) => {
    if (cents == null) return '—';
    return `$${(cents / 100).toFixed(2)}`;
  };

  const renderResultBody = (): JSX.Element | null => {
    if (isScanning) {
      return (
        <div className="rounded-xl border border-white/5 bg-slate-900/60 px-4 py-5 text-sm text-slate-200">
          Looking up…
        </div>
      );
    }

    if (!scanPreview && !error) {
      return (
        <EmptyStateCard
          badge="Lab"
          title="No manual lookup yet"
          body="Describe a merchant, amount, and optional category on the left, then run a manual lookup to see how Cherry would route the swipe."
          hint="Advisory only; start a session after you get a recommendation if you want to claim Cherry Points."
          action={
            <button
              type="button"
              onClick={focusMerchantField}
              className="text-sm text-pink-200 underline decoration-dotted underline-offset-4 hover:text-pink-100"
            >
              Run a lookup
            </button>
          }
        />
      );
    }

    if (!scanPreview && error) {
      return (
        <div className="rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-200/80">
            Lookup failed
          </p>
          <p className="text-sm">{error}</p>
        </div>
      );
    }

    if (!scanPreview) return null;

    const hasCard = Boolean(scanPreview.recommendedCardName);
    const bucketLimit = scanPreview.bucketBudgetCents ?? null;
    const bucketSpent = scanPreview.bucketSpentCents ?? null;
    const bucketRemaining =
      bucketLimit != null && bucketSpent != null ? bucketLimit - bucketSpent : null;
    const bucketUsagePercent =
      bucketLimit != null && bucketSpent != null && bucketLimit > 0
        ? Math.min(100, Math.max(0, (bucketSpent / bucketLimit) * 100))
        : null;

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-white/5 bg-slate-900/60 px-4 py-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-label-tight text-slate-400">Advisory preview</p>
            <p className="text-lg font-semibold text-white">
              {scanPreview.category ?? 'UNCATEGORIZED'} · {formatCents(scanPreview.amountCents)} ·{' '}
              {scanPreview.bucketName || 'No bucket'}
            </p>
            <p className="text-sm text-slate-300">
              Stateless preview. Start a session to track and earn points.
            </p>
          </div>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-100">
            {scanPreview.bucketVerdict}
          </span>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-200/80">
              Lookup issue
            </p>
            <p className="text-sm">{error}</p>
          </div>
        ) : null}

        {hasCard ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3">
            <div className="space-y-0.5">
              <p className="text-xs text-slate-400">Recommended card</p>
              <p className="text-sm font-semibold text-slate-100">
                {scanPreview.recommendedCardName ?? 'No card on file'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Estimated rewards</p>
              <p className="text-sm font-semibold text-pink-200">
                {scanPreview.recommendedRewardLabel ?? '—'}
              </p>
            </div>
          </div>
        ) : (
          <EmptyStateCard
            badge="Engine"
            title="No rewards match found"
            body="Cherry could not find a card with a clear rewards advantage for this swipe."
            hint="You can still review bucket impact and start a session."
          />
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1 rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3">
            <p className="text-xs font-semibold text-slate-300">Advisory points</p>
            <p className="text-lg font-semibold text-white">
              {scanPreview.isSnapshot
                ? '0 pts (snapshot only)'
                : `${scanPreview.advisoryPoints} pts`}
            </p>
            <p className="text-xs text-slate-500">
              {scanPreview.isSnapshot
                ? 'Set amount above 0 to earn points.'
                : 'Earned if you follow the recommendation.'}
            </p>
          </div>
          <div className="space-y-1 rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3">
            <p className="text-xs font-semibold text-slate-300">Bucket impact</p>
            <p className="text-sm text-slate-200">{scanPreview.bucketName ?? 'No bucket matched'}</p>
            {bucketUsagePercent != null ? (
              <p className="text-xs text-slate-500">
                Used {bucketUsagePercent.toFixed(0)}% ·{' '}
                {bucketRemaining != null ? `${formatCents(bucketRemaining)} left` : null}
              </p>
            ) : (
              <p className="text-xs text-slate-500">
                {scanPreview.bucketBudgetCents != null
                  ? 'No spend recorded yet.'
                  : 'No tracked balances for this category.'}
              </p>
            )}
          </div>
        </div>

        {!sessionState ? (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3">
            <button
              type="button"
              onClick={startSession}
              disabled={isStartingSession || scanPreview.isSnapshot}
              className="rounded-md bg-pink-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-pink-500 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              {isStartingSession ? 'Starting session…' : 'Start session & earn points'}
            </button>
            {scanPreview.isSnapshot ? (
              <span className="text-xs text-slate-400">
                Snapshot only — set an amount to open a session.
              </span>
            ) : (
              <span className="text-xs text-slate-400">
                Sessions let you claim Cherry Points for following the recommendation.
              </span>
            )}
          </div>
        ) : (
          <div className="space-y-2 rounded-xl border border-white/5 bg-slate-900/70 p-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-200">
              <span className="rounded-full bg-white/10 px-2 py-1 font-semibold">
                Session ID: {sessionState.id}
              </span>
              <span className="rounded-full bg-white/10 px-2 py-1 font-semibold">
                Order token: {sessionState.orderToken}
              </span>
              <span className="rounded-full bg-white/10 px-2 py-1 font-semibold">
                Expires in: {formattedCountdown || '—'}
              </span>
              <span className="rounded-full bg-white/10 px-2 py-1 font-semibold">
                Status: {sessionState.status}
              </span>
            </div>
            <p className="text-xs text-slate-300">
              1) Pay with your recommended card. 2) Tap “I used this card” to claim. 3) Use Bank
              Simulator to post points.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={confirmSession}
                disabled={isConfirming || sessionState.status !== 'OPEN'}
                className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-400 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2 focus:ring-offset-slate-900"
              >
                {isConfirming ? 'Submitting…' : 'I used this card'}
              </button>
              <Link
                href="/bank-simulator"
                className="text-sm text-pink-200 underline decoration-dotted underline-offset-4"
              >
                Open Bank Simulator
              </Link>
              <Link
                href="/sessions"
                className="text-sm text-slate-300 underline decoration-dotted underline-offset-4"
              >
                View in Sessions/Activity
              </Link>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-8 text-slate-100">
      <div className="space-y-1">
        <p className="text-sm uppercase tracking-label text-pink-200">Cherry Lab</p>
        <h1 className="text-3xl font-semibold text-white">Manual lookup &amp; rewards</h1>
        <p className="text-slate-300">
          Probe the decision engine for a single hypothetical swipe: see card choice, rewards, and bucket impact.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-white/5 bg-white/5 p-4 shadow-lg backdrop-blur lg:p-5"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-0.5">
              <h2 className="text-sm font-semibold text-slate-100">Request</h2>
              <p className="text-xs text-slate-400">
                Describe a hypothetical swipe for Cherry to evaluate.
              </p>
            </div>
            <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-200">
              Lab
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-sm text-slate-300">Merchant name</span>
              <input
                ref={merchantInputRef}
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
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="24.50"
                type="number"
                min="0"
                step="0.01"
              />
              <p className="text-xs text-slate-500">Enter 0 for a bucket snapshot (no points).</p>
            </label>
            <label className="space-y-1 md:col-span-2">
              <span className="text-sm text-slate-300">Category (optional)</span>
              <input
                className={inputClass}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="DINING"
              />
              <p className="text-xs text-slate-500">
                Optional. Helps Cherry disambiguate when MCC metadata is missing.
              </p>
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={isScanning}
              className="rounded-md bg-pink-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-pink-400 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              {isScanning ? 'Looking up…' : 'Manual lookup & rewards'}
            </button>
            <button
              type="button"
              onClick={reset}
              className="text-xs text-slate-400 underline decoration-dotted underline-offset-4"
            >
              Reset
            </button>
          </div>
          <ErrorBanner message={error} />
        </form>

        <section className="rounded-2xl border border-white/5 bg-white/5 p-4 shadow-lg backdrop-blur lg:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Result</h2>
              <p className="text-xs text-slate-400">
                See the recommended card, rewards, and bucket impact for this swipe.
              </p>
            </div>
          </div>

          <div className="space-y-3">{renderResultBody()}</div>
        </section>
      </div>
    </div>
  );
}
