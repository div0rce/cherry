'use client';

import { useEffect, useMemo, useState, type FormEvent, type JSX } from 'react';
import Link from 'next/link';
import type { EngineDecision } from '@/lib/engine';
import type { ScanResponse } from '@/lib/schemas/scan';
import { ScanResponseSchema } from '@/lib/schemas/scan';
import { callApi } from '@/lib/client/api';
import { useApiAction } from '@/lib/client/useApiAction';
import { ErrorBanner } from '@/components/ErrorBanner';

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

  return (
    <div className="space-y-6">
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
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="24.50"
              type="number"
              min="0"
              step="0.01"
            />
            <p className="text-xs text-slate-500">Enter 0 for a bucket snapshot (no points).</p>
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
            disabled={isScanning}
            className="rounded-md bg-pink-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-pink-400 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            {isScanning ? 'Looking up…' : 'Manual Lookup & Rewards'}
          </button>
          <ErrorBanner message={error} />
          <button
            type="button"
            onClick={reset}
            className="text-xs text-slate-400 underline decoration-dotted underline-offset-4"
          >
            Reset
          </button>
        </div>
      </form>

      {scanPreview && (
        <div className="space-y-4 rounded-2xl border border-white/5 bg-white/5 p-4 shadow-lg backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-label text-slate-400">Advisory preview</p>
              <h2 className="text-xl font-semibold text-white">
                {scanPreview.category ?? 'UNCATEGORIZED'} · $
                {(scanPreview.amountCents / 100).toFixed(2)} · {scanPreview.bucketName || 'No bucket'}
              </h2>
              <p className="text-sm text-slate-300">
                This is a stateless preview. Start a session to track and earn points.
              </p>
            </div>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-100">
              {scanPreview.bucketVerdict}
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-white/5 bg-slate-900/40 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Card</p>
              <p className="text-sm text-white">
                {scanPreview.recommendedCardName ?? 'No card on file'}
              </p>
              {scanPreview.recommendedRewardLabel && (
                <p className="text-xs text-slate-400">{scanPreview.recommendedRewardLabel}</p>
              )}
            </div>
            <div className="rounded-lg border border-white/5 bg-slate-900/40 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Points (advisory)</p>
              <p className="text-lg font-semibold text-white">
                {scanPreview.isSnapshot
                  ? '0 pts (snapshot only)'
                  : `${scanPreview.advisoryPoints} pts`}
              </p>
            </div>
            <div className="rounded-lg border border-white/5 bg-slate-900/40 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Bucket</p>
              <p className="text-sm text-white">{scanPreview.bucketName ?? 'None'}</p>
              {scanPreview.bucketBudgetCents != null && scanPreview.bucketSpentCents != null && (
                <p className="text-xs text-slate-400">
                  Spent {((scanPreview.bucketSpentCents / scanPreview.bucketBudgetCents) * 100).toFixed(0)}%
                </p>
              )}
            </div>
          </div>

          {!sessionState && (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={startSession}
                disabled={isStartingSession || scanPreview.isSnapshot}
                className="rounded-md bg-pink-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-pink-400 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:ring-offset-2 focus:ring-offset-slate-900"
              >
                {isStartingSession ? 'Starting session…' : 'Start session & earn points'}
              </button>
              {scanPreview.isSnapshot && (
                <span className="text-xs text-slate-400">
                  Snapshot only — start a session with an amount to earn points.
                </span>
              )}
            </div>
          )}

          {sessionState && (
            <div className="space-y-2 rounded-xl border border-white/5 bg-slate-900/50 p-3">
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
      )}
    </div>
  );
}
