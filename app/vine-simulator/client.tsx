'use client';

import Link from 'next/link';
import type { JSX } from 'react';
import type { OverallVerdict } from '@/lib/enums';
import { useState, FormEvent, useRef, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import type { EngineDecision } from '@/lib/engine';
import type { z } from 'zod';
import { vineTerminalEventSchema } from '@/lib/schemas/vine-terminal';
import type { VineTerminalEventInput } from '@/lib/schemas/vine-terminal';

type VineOrderResponse = {
  sessionId: string;
  decision: EngineDecision;
  orderToken: string;
  expiresAt?: string;
};

type ConfirmResponse = {
  pointsAwarded: number;
  totalPoints?: number;
};

type VineTerminalPayload = z.infer<typeof vineTerminalEventSchema>;

type Status =
  | { type: 'idle' }
  | { type: 'submitting' }
  | { type: 'success'; message: string }
  | { type: 'error'; message: string };

const inputClass =
  'w-full rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-pink-500 focus:outline-none';

export function VineSimulatorClient(): JSX.Element {
  const [merchantName, setMerchantName] = useState('');
  const [amountDollars, setAmountDollars] = useState('');
  const [mccCode, setMccCode] = useState('');
  const [deviceId, setDeviceId] = useState('VINE-SIM-1');
  const [currency, setCurrency] = useState('USD');
  const [extendedMode, setExtendedMode] = useState(false);
  const [storeId, setStoreId] = useState('');
  const [terminalId, setTerminalId] = useState('VINE-SIM-1');
  const [cardBrand, setCardBrand] = useState('');
  const [cardBin, setCardBin] = useState('');
  const [cardLast4, setCardLast4] = useState('');
  const [orderResult, setOrderResult] = useState<VineOrderResponse | null>(null);
  const [confirmResult, setConfirmResult] = useState<ConfirmResponse | null>(null);
  const [status, setStatus] = useState<Status>({ type: 'idle' });
  const timeoutRef = useRef<number | null>(null);

  function setTransientStatus(next: Status, ms = 5000) {
    setStatus(next);
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }
    if (next.type === 'error' || next.type === 'success') {
      timeoutRef.current = window.setTimeout(() => {
        setStatus({ type: 'idle' });
        timeoutRef.current = null;
      }, ms);
    }
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setConfirmResult(null);
    setTransientStatus({ type: 'submitting' });

    const parsedAmount = Number.parseFloat(amountDollars);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setTransientStatus({ type: 'error', message: 'Enter an amount greater than 0.' });
      return;
    }
    const amountCents = Math.round(parsedAmount * 100);

    const trimmedMcc = mccCode.trim();
    if (!/^\d{4}$/.test(trimmedMcc)) {
      setTransientStatus({
        type: 'error',
        message: 'MCC must be a 4-digit code present in the MCC mapping.',
      });
      return;
    }
    const mccString = trimmedMcc;

    setTransientStatus({ type: 'submitting' });
    const cardBrandValue = cardBrand.trim() || undefined;
    const vineSourceValue =
      ('VINE_SIM' as VineTerminalPayload['vine'] extends { source?: infer S }
        ? S
        : never);

    const payload: VineTerminalPayload = {
      amount: amountCents,
      currency: currency.trim().toUpperCase(),
      mcc: mccString,
      vine: { source: vineSourceValue },
      ...(extendedMode
        ? {
            merchant: {
              merchantName: merchantName.trim() || undefined,
              storeId: storeId.trim() || undefined,
              mcc: mccString,
            },
            terminal: {
              terminalId: terminalId.trim() || undefined,
            },
            card:
              cardBrandValue || cardBin || cardLast4
                ? {
                    brand: cardBrandValue as VineTerminalEventInput['card'] extends { brand?: infer B }
                      ? B
                      : undefined,
                    bin: cardBin.trim() || undefined,
                    last4: cardLast4.trim() || undefined,
                  }
                : undefined,
          }
        : {}),
    };

    const validation = vineTerminalEventSchema.safeParse(payload);
    if (!validation.success) {
      const firstIssue = validation.error.issues.at(0);
      setTransientStatus(
        { type: 'error', message: firstIssue?.message ?? 'Invalid payload' },
        6000
      );
      return;
    }

    const res = await fetch('/api/vine/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.status === 401) {
      setTransientStatus({ type: 'error', message: 'Sign in to use the Vine simulator.' }, 6000);
      void signIn(undefined, { callbackUrl: window.location.href });
      return;
    }

    if (!res.ok) {
      let friendly = 'Failed to create recommendation.';
      try {
        const json = (await res.json()) as unknown;
        if (json && typeof json === 'object' && 'error' in (json as Record<string, unknown>)) {
          const maybeError = (json as { error?: unknown }).error;
          if (typeof maybeError === 'string') {
            friendly = maybeError;
          }
        }
      } catch {
        // ignore parse errors; keep friendly default
      }

      setTransientStatus({ type: 'error', message: friendly }, 6000);
      return;
    }

    const data = (await res.json()) as VineOrderResponse;
    setOrderResult(data);
    setTransientStatus({ type: 'success', message: 'Recommendation ready.' }, 3000);
  }

  async function handleConfirm() {
    if (!orderResult) return;
    setTransientStatus({ type: 'submitting' });

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
      setTransientStatus({ type: 'error', message: 'Sign in to confirm.' }, 6000);
      void signIn(undefined, { callbackUrl: window.location.href });
      return;
    }

    if (!res.ok) {
      const message = await res.text();
      setTransientStatus(
        { type: 'error', message: message || 'Failed to confirm session' },
        6000
      );
      return;
    }

    const data = (await res.json()) as ConfirmResponse;
    setConfirmResult(data);
    setTransientStatus({ type: 'success', message: 'Session confirmed.' }, 3000);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8 text-slate-100">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-label text-pink-200">Cherry Vine</p>
        <h1 className="text-3xl font-semibold text-white">Vine simulator</h1>
        <p className="text-slate-300">
          Developer-only tool to post fake order context into /api/vine/order. No BLE/NFC/payment is simulated.
        </p>
      </header>

      <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 p-3">
        <div>
          <p className="text-sm font-semibold text-white">Merchant data exposure</p>
          <p className="text-xs text-slate-400">
            Minimal: amount + MCC only. Extended: include optional merchant/terminal/card metadata.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExtendedMode((prev) => !prev)}
          className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-slate-100 hover:bg-white/10"
        >
          {extendedMode ? 'Extended mode' : 'Minimal mode'}
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-white/5 bg-white/5 p-4 shadow-lg backdrop-blur"
      >
        <div className="grid gap-4 md:grid-cols-2">
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
            <span className="text-sm text-slate-300">MCC (required)</span>
            <input
              className={inputClass}
              value={mccCode}
              onChange={(e) => setMccCode(e.target.value)}
              placeholder="5812"
              inputMode="numeric"
              pattern="\d{4}"
              required
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm text-slate-300">Currency</span>
            <input
              className={inputClass}
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              placeholder="USD"
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

        {extendedMode && (
          <div className="space-y-4">
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
                <span className="text-sm text-slate-300">Store ID</span>
                <input
                  className={inputClass}
                  value={storeId}
                  onChange={(e) => setStoreId(e.target.value)}
                  placeholder="STORE-123"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm text-slate-300">Terminal ID</span>
                <input
                  className={inputClass}
                  value={terminalId}
                  onChange={(e) => setTerminalId(e.target.value)}
                  placeholder="TERM-1"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm text-slate-300">Card brand</span>
                <input
                  className={inputClass}
                  value={cardBrand}
                  onChange={(e) => setCardBrand(e.target.value)}
                  placeholder="VISA"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm text-slate-300">Card BIN (first 6-8)</span>
                <input
                  className={inputClass}
                  value={cardBin}
                  onChange={(e) => setCardBin(e.target.value)}
                  placeholder="411111"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm text-slate-300">Card Last4</span>
                <input
                  className={inputClass}
                  value={cardLast4}
                  onChange={(e) => setCardLast4(e.target.value)}
                  placeholder="4242"
                />
              </label>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="rounded-md bg-pink-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-60"
            disabled={status.type === 'submitting'}
          >
            {status.type === 'submitting' ? 'Creating…' : 'Create recommendation'}
          </button>
          {status.type === 'error' && (
            <span className="text-sm text-red-400">{status.message}</span>
          )}
          {status.type === 'success' && (
            <span className="text-sm text-emerald-400">{status.message}</span>
          )}
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
              {orderResult.expiresAt && (
                <p className="text-xs text-slate-400">
                  Expires at: {new Date(orderResult.expiresAt).toLocaleString()}
                </p>
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
            {orderResult.decision.overallVerdict !==
              ('INSUFFICIENT_DATA' as OverallVerdict) &&
            (orderResult.decision.cherryIncentive.pointsIfFollowed ?? 0) > 0 ? (
              <button
                type="button"
                onClick={handleConfirm}
                className="rounded-md border border-pink-400 px-4 py-2 text-sm font-semibold text-pink-100 hover:bg-pink-500/10 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:ring-offset-2 focus:ring-offset-slate-900"
              >
                Simulate payment at terminal and apply points
              </button>
            ) : (
              <span className="text-sm text-amber-200">
                {orderResult.decision.overallVerdict === ('INSUFFICIENT_DATA' as OverallVerdict)
                  ? 'No points available — add a card and bucket to enable rewards.'
                  : 'No points available for this amount.'}
              </span>
            )}
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
