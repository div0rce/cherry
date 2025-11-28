'use client';

import Link from 'next/link';
import { useState, FormEvent } from 'react';
import { signIn } from 'next-auth/react';
import type { EngineDecision } from '@/lib/engine';

type VineOrderResponse = {
  sessionId: string;
  decision: EngineDecision;
  orderToken?: string;
};

type ConfirmResponse = {
  pointsAwarded: number;
  totalPoints?: number;
};

const inputClass =
  'w-full rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-pink-500 focus:outline-none';

export function VineSimulatorClient() {
  const [merchantName, setMerchantName] = useState('');
  const [amountDollars, setAmountDollars] = useState('');
  const [mccCode, setMccCode] = useState('');
  const [deviceId, setDeviceId] = useState('VINE-SIM-1');
  const [orderResult, setOrderResult] = useState<VineOrderResponse | null>(null);
  const [confirmResult, setConfirmResult] = useState<ConfirmResponse | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setConfirmResult(null);

    const parsedAmount = Number.parseFloat(amountDollars);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setStatus('Enter an amount greater than 0.');
      return;
    }
    const amountCents = Math.round(parsedAmount * 100);

    const parsedMcc = mccCode.trim() ? Number.parseInt(mccCode, 10) : undefined;
    if (parsedMcc != null && (!Number.isInteger(parsedMcc) || String(parsedMcc).length !== 4)) {
      setStatus('MCC must be a 4-digit code.');
      return;
    }

    setStatus('Sending to Vine…');
    const res = await fetch('/api/vine/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchantName: merchantName.trim() || undefined,
        amountCents,
        mccCode: parsedMcc,
        deviceId: deviceId.trim() || 'VINE-SIM-1',
      }),
    });

    if (res.status === 401) {
      setStatus('Sign in to use the Vine simulator.');
      void signIn(undefined, { callbackUrl: window.location.href });
      return;
    }

    if (!res.ok) {
      const message = await res.text();
      setStatus(message || 'Failed to create recommendation');
      return;
    }

    const data = (await res.json()) as VineOrderResponse;
    setOrderResult(data);
    setStatus('Recommendation ready.');
  }

  async function handleConfirm() {
    if (!orderResult) return;
    setStatus('Confirming…');

    const res = await fetch(`/api/sessions/${orderResult.sessionId}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        followedRecommendation: true,
        actualAmountCents: orderResult.decision.amountCents,
        usedCardId: orderResult.decision.card.cardId,
      }),
    });

    if (res.status === 401) {
      setStatus('Sign in to confirm.');
      void signIn(undefined, { callbackUrl: window.location.href });
      return;
    }

    if (!res.ok) {
      const message = await res.text();
      setStatus(message || 'Failed to confirm session');
      return;
    }

    const data = (await res.json()) as ConfirmResponse;
    setConfirmResult(data);
    setStatus('Session confirmed.');
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8 text-slate-100">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.2em] text-pink-200">Cherry Vine</p>
        <h1 className="text-3xl font-semibold text-white">Vine simulator</h1>
        <p className="text-slate-300">
          Post a mock POS order, see the recommendation session, then confirm it to award points.
        </p>
      </header>

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
            <span className="text-sm text-slate-300">MCC (optional)</span>
            <input
              className={inputClass}
              value={mccCode}
              onChange={(e) => setMccCode(e.target.value)}
              placeholder="5812"
              inputMode="numeric"
              pattern="\d{4}"
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm text-slate-300">Device ID</span>
            <input
              className={inputClass}
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              placeholder="VINE-SIM-1"
              required
            />
          </label>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="rounded-md bg-pink-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            Create recommendation
          </button>
          {status && <span className="text-sm text-slate-300">{status}</span>}
        </div>
      </form>

      {orderResult && (
        <div className="rounded-2xl border border-white/5 bg-white/5 p-4 shadow-lg backdrop-blur space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-300">Session</p>
              <p className="text-lg font-semibold text-white">{orderResult.sessionId}</p>
              {orderResult.orderToken && (
                <p className="text-xs text-slate-400">Token: {orderResult.orderToken}</p>
              )}
            </div>
              <div className="text-right">
                <p className="text-sm text-slate-300">Verdict</p>
                <p className="text-lg font-semibold text-white">
                  {orderResult.decision.overallVerdict}
                </p>
              </div>
            </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-white/5 bg-slate-900/40 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Recommended card</p>
              <p className="text-sm text-white">
                {orderResult.decision.card.cardNickname ?? 'No card on file'}
              </p>
              {orderResult.decision.card.verdict === 'NO_CARD_DATA' && (
                <p className="text-xs text-amber-200">
                  Cherry cannot optimize rewards — no card data on file.
                </p>
              )}
            </div>
            <div className="rounded-lg border border-white/5 bg-slate-900/40 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Bucket</p>
              <p className="text-sm text-white">
                {orderResult.decision.budget.name ?? 'No bucket'}
              </p>
              {orderResult.decision.budget.limitCents != null && (
                <p className="text-xs text-slate-300">
                  Limit ${(orderResult.decision.budget.limitCents / 100).toFixed(2)}
                </p>
              )}
              {orderResult.decision.budget.verdict === 'UNCONFIGURED' && (
                <p className="text-xs text-amber-200">
                  No bucket configured; Cherry cannot assess budget health.
                </p>
              )}
              {orderResult.decision.budget.verdict === 'UNBOUNDED' && (
                <p className="text-xs text-slate-300">
                  Intentionally unbudgeted; rewards optimization only.
                </p>
              )}
            </div>
            <div className="rounded-lg border border-white/5 bg-slate-900/40 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Cherry points</p>
              <p className="text-sm text-white">
                {orderResult.decision.cherryIncentive.pointsIfFollowed} pts if followed
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleConfirm}
              className="rounded-md border border-pink-400 px-4 py-2 text-sm font-semibold text-pink-100 hover:bg-pink-500/10 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              Confirm and award points
            </button>
            <Link href="/sessions" className="text-sm text-pink-200 hover:text-pink-100">
              View sessions →
            </Link>
            {confirmResult && (
              <p className="text-sm text-slate-200">
                Awarded {confirmResult.pointsAwarded} pts
                {confirmResult.totalPoints != null
                  ? ` • Balance ${confirmResult.totalPoints} pts`
                  : ''}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
