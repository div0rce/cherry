'use client';

import type { JSX } from 'react';
import type { OverallVerdict } from '../../../lib/enums';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { signIn } from 'next-auth/react';
import type { LegacyEngineDecision } from '../../../lib/engine';
import type { z } from 'zod';
import { vineTerminalEventSchema } from '../../../lib/schemas/vine-terminal';
import type { VineTerminalEventInput } from '../../../lib/schemas/vine-terminal';
import { hasText } from '../../../lib/text';
import { isPositiveNumber } from '../../../lib/numbers';
import { logGuardrailEvent, logInvariantViolation } from '../../../lib/log';
import { callApi } from '../../../lib/client/api';
import { Card } from '../../../components/ui/card';
import { Button, ButtonLink } from '../../../components/ui/Button';
import { Alert } from '../../../components/ui/alert';

type VineOrderResponse = {
  sessionId: string;
  decision: LegacyEngineDecision;
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
  const getTimestamp = () => {
    if (typeof performance !== 'undefined' && typeof performance.timeOrigin === 'number') {
      return new Date(performance.timeOrigin + performance.now()).toISOString();
    }
    return new Date(0).toISOString();
  };

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
    if (!Number.isFinite(parsedAmount) || !isPositiveNumber(parsedAmount)) {
      setTransientStatus({ type: 'error', message: 'Enter an amount greater than 0.' });
      logGuardrailEvent({
        userId: null,
        surface: 'vine',
        outcome: 'STOP',
        reason: 'INVALID_AMOUNT',
        timestamp: getTimestamp(),
        timestampSource: 'client',
      });
      return;
    }
    const amountCents = Math.round(parsedAmount * 100);

    const trimmedMcc = mccCode.trim();
    if (!/^\d{4}$/.test(trimmedMcc)) {
      setTransientStatus({
        type: 'error',
        message: 'MCC must be a 4-digit code present in the MCC mapping.',
      });
      logGuardrailEvent({
        userId: null,
        surface: 'vine',
        outcome: 'STOP',
        reason: 'INVALID_MCC',
        timestamp: getTimestamp(),
        timestampSource: 'client',
      });
      return;
    }
    const mccString = trimmedMcc;

    const currencyTrimmed = currency.trim().toUpperCase();
    if (!hasText(currencyTrimmed)) {
      setTransientStatus({ type: 'error', message: 'Currency is required.' });
      logGuardrailEvent({
        userId: null,
        surface: 'vine',
        outcome: 'STOP',
        reason: 'MISSING_CURRENCY',
        timestamp: getTimestamp(),
        timestampSource: 'client',
      });
      return;
    }

    setTransientStatus({ type: 'submitting' });
    const cardBrandTrimmed = cardBrand.trim().toUpperCase();
    const cardBrandValue =
      hasText(cardBrandTrimmed) && cardBrandTrimmed.length > 0
        ? (cardBrandTrimmed as VineTerminalEventInput['card'] extends { brand?: infer B }
            ? B
            : never)
        : undefined;
    const cardBinTrimmed = cardBin.trim();
    const cardLast4Trimmed = cardLast4.trim();
    const vineSourceValue =
      ('VINE_SIM' as VineTerminalPayload['vine'] extends { source?: infer S }
        ? S
        : never);
    const hasCardDetails =
      cardBrandValue !== undefined ||
      hasText(cardBinTrimmed) ||
      hasText(cardLast4Trimmed);

    const payload: VineTerminalPayload = {
      amount: amountCents,
      currency: currencyTrimmed,
      mcc: mccString,
      vine: { source: vineSourceValue },
      ...(extendedMode
        ? {
            merchant: {
              merchantName: hasText(merchantName.trim()) ? merchantName.trim() : undefined,
              storeId: hasText(storeId.trim()) ? storeId.trim() : undefined,
              mcc: mccString,
            },
            terminal: {
              terminalId: hasText(terminalId.trim()) ? terminalId.trim() : undefined,
            },
            card: hasCardDetails
              ? {
                  brand: cardBrandValue,
                  bin: hasText(cardBinTrimmed) ? cardBinTrimmed : undefined,
                  last4: hasText(cardLast4Trimmed) ? cardLast4Trimmed : undefined,
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
      logGuardrailEvent({
        userId: null,
        surface: 'vine',
        outcome: 'STOP',
        reason: 'INVALID_VINE_SIGNAL',
        detail: validation.error.flatten(),
        timestamp: getTimestamp(),
        timestampSource: 'client',
      });
      return;
    }

    const res = await callApi<VineOrderResponse>('/api/vine/order', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!res.ok && res.error === 'UNAUTHORIZED') {
      logGuardrailEvent({
        userId: null,
        surface: 'vine',
        outcome: 'STOP',
        reason: 'UNAUTHENTICATED',
        timestamp: getTimestamp(),
        timestampSource: 'client',
      });
      setTransientStatus({ type: 'error', message: 'Sign in to use the Vine simulator.' }, 6000);
      void signIn(undefined, { callbackUrl: window.location.href });
      return;
    }

    if (!res.ok) {
      const friendly = hasText(res.message) ? res.message : 'Failed to create recommendation.';
      logGuardrailEvent({
        userId: null,
        surface: 'vine',
        outcome: 'FALLBACK',
        reason: 'VINE_ORDER_FAILED',
        detail: { error: res.error },
        timestamp: getTimestamp(),
        timestampSource: 'client',
      });
      setTransientStatus({ type: 'error', message: friendly }, 6000);
      return;
    }

    setOrderResult(res.data);
    setTransientStatus({ type: 'success', message: 'Recommendation ready.' }, 3000);
  }

  async function handleConfirm() {
    if (orderResult === null) {
      logGuardrailEvent({
        userId: null,
        surface: 'vine',
        outcome: 'STOP',
        reason: 'CONFIRM_WITHOUT_ORDER',
        timestamp: getTimestamp(),
        timestampSource: 'client',
      });
      return;
    }
    if (!hasText(orderResult.decision.card.cardId)) {
      logInvariantViolation({
        surface: 'vine',
        detail: 'Missing cardId when confirming Vine session',
        data: orderResult,
        timestamp: getTimestamp(),
      });
      setTransientStatus({ type: 'error', message: 'Invalid recommendation state.' }, 6000);
      return;
    }
    if (!isPositiveNumber(orderResult.decision.amountCents)) {
      logGuardrailEvent({
        userId: null,
        surface: 'vine',
        outcome: 'STOP',
        reason: 'INVALID_DECISION_AMOUNT',
        timestamp: getTimestamp(),
        timestampSource: 'client',
      });
      setTransientStatus({ type: 'error', message: 'Invalid amount on recommendation.' }, 6000);
      return;
    }
    setTransientStatus({ type: 'submitting' });

    const res = await callApi<ConfirmResponse>(`/api/sessions/${orderResult.sessionId}/confirm`, {
      method: 'POST',
      body: JSON.stringify({
        followedRecommendation: true,
        actualAmountCents: orderResult.decision.amountCents,
        usedCardId: orderResult.decision.card.cardId,
      }),
    });

    if (!res.ok && res.error === 'UNAUTHORIZED') {
      logGuardrailEvent({
        userId: null,
        surface: 'vine',
        outcome: 'STOP',
        reason: 'UNAUTHENTICATED',
        timestamp: getTimestamp(),
        timestampSource: 'client',
      });
      setTransientStatus({ type: 'error', message: 'Sign in to confirm.' }, 6000);
      void signIn(undefined, { callbackUrl: window.location.href });
      return;
    }

    if (!res.ok) {
      logGuardrailEvent({
        userId: null,
        surface: 'vine',
        outcome: 'FALLBACK',
        reason: 'SESSION_CONFIRM_FAILED',
        detail: { error: res.error },
        timestamp: getTimestamp(),
        timestampSource: 'client',
      });
      const friendlyMessage = hasText(res.message) ? res.message : 'Failed to confirm session';
      setTransientStatus(
        { type: 'error', message: friendlyMessage },
        6000
      );
      return;
    }

    setConfirmResult(res.data);
    setTransientStatus({ type: 'success', message: 'Session confirmed.' }, 3000);
  }

  return (
    <div className="space-y-6">
      <Card tone="muted" padding="md" className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-[#f8fafc]">Merchant data exposure</p>
          <p className="text-xs text-[#a5b0d0]">
            Minimal: amount + MCC only. Extended: include optional merchant/terminal/card metadata.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setExtendedMode((prev) => !prev)}
          variant="secondary"
          size="sm"
        >
          {extendedMode ? 'Extended mode' : 'Minimal mode'}
        </Button>
      </Card>

      <Card tone="muted" padding="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-sm text-[#c3cce5]">Amount (USD)</span>
              <input
                className={inputClass}
                value={amountDollars}
                onChange={(e) => setAmountDollars(e.target.value)}
                placeholder="24.50"
                type="number"
                min="0.01"
                step="0.01"
                required
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm text-[#c3cce5]">MCC (required)</span>
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
              <span className="text-sm text-[#c3cce5]">Currency</span>
              <input
                className={inputClass}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                placeholder="USD"
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm text-[#c3cce5]">Device ID</span>
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
                  <span className="text-sm text-[#c3cce5]">Merchant name</span>
                  <input
                    className={inputClass}
                    value={merchantName}
                    onChange={(e) => setMerchantName(e.target.value)}
                    placeholder="Cherry Coffee"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-sm text-[#c3cce5]">Store ID</span>
                  <input
                    className={inputClass}
                    value={storeId}
                    onChange={(e) => setStoreId(e.target.value)}
                    placeholder="STORE-123"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-sm text-[#c3cce5]">Terminal ID</span>
                  <input
                    className={inputClass}
                    value={terminalId}
                    onChange={(e) => setTerminalId(e.target.value)}
                    placeholder="TERM-1"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-sm text-[#c3cce5]">Card brand</span>
                  <input
                    className={inputClass}
                    value={cardBrand}
                    onChange={(e) => setCardBrand(e.target.value)}
                    placeholder="VISA"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-sm text-[#c3cce5]">Card BIN (first 6-8)</span>
                  <input
                    className={inputClass}
                    value={cardBin}
                    onChange={(e) => setCardBin(e.target.value)}
                    placeholder="411111"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-sm text-[#c3cce5]">Card Last4</span>
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

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={status.type === 'submitting'}>
              {status.type === 'submitting' ? 'Creating…' : 'Create recommendation'}
            </Button>
            {status.type === 'error' && <Alert variant="danger" title="Error" description={status.message} />}
            {status.type === 'success' && (
              <Alert variant="success" title="Success" description={status.message} />
            )}
          </div>
        </form>
      </Card>

      {orderResult !== null ? (
        <Card tone="muted" padding="md" className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#c3cce5]">Session</p>
              <p className="text-lg font-semibold text-[#f8fafc]">{orderResult.sessionId}</p>
              {hasText(orderResult.orderToken) && (
                <p className="text-xs text-[#a5b0d0]">Token: {orderResult.orderToken}</p>
              )}
              {hasText(orderResult.expiresAt) && (
                <p className="text-xs text-[#a5b0d0]">
                  Expires at: {new Date(orderResult.expiresAt).toLocaleString()}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-[#c3cce5]">Verdict</p>
              <p className="text-lg font-semibold text-[#f8fafc]">
                {orderResult.decision.overallVerdict}
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <Card tone="base" padding="sm">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#c3cce5]">Recommended card</p>
              <p className="text-sm text-[#f8fafc]">
                {orderResult.decision.card.cardNickname ?? 'No card on file'}
              </p>
              {orderResult.decision.card.verdict === 'NO_CARD_DATA' && (
                <p className="text-xs text-amber-200">
                  Cherry cannot optimize rewards — no card data on file.
                </p>
              )}
            </Card>
            <Card tone="base" padding="sm">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#c3cce5]">Bucket</p>
              <p className="text-sm text-[#f8fafc]">
                {orderResult.decision.budget.name ?? 'No bucket'}
              </p>
              {orderResult.decision.budget.limitCents != null && (
                <p className="text-xs text-[#c3cce5]">
                  Limit ${(orderResult.decision.budget.limitCents / 100).toFixed(2)}
                </p>
              )}
              {orderResult.decision.budget.verdict === 'UNCONFIGURED' && (
                <p className="text-xs text-amber-200">
                  No bucket configured; Cherry cannot assess budget health.
                </p>
              )}
              {orderResult.decision.budget.verdict === 'UNBOUNDED' && (
                <p className="text-xs text-[#c3cce5]">
                  Intentionally unbudgeted; rewards optimization only.
                </p>
              )}
            </Card>
            <Card tone="base" padding="sm">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#c3cce5]">Cherry points</p>
              <p className="text-sm text-[#f8fafc]">
                {orderResult.decision.cherryIncentive.pointsIfFollowed} pts if followed
              </p>
            </Card>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {orderResult.decision.overallVerdict !==
              ('INSUFFICIENT_DATA' as OverallVerdict) &&
            (orderResult.decision.cherryIncentive.pointsIfFollowed ?? 0) > 0 ? (
              <Button type="button" variant="secondary" onClick={handleConfirm}>
                Simulate payment at terminal and apply points
              </Button>
            ) : (
              <span className="text-sm text-amber-200">
                {orderResult.decision.overallVerdict === ('INSUFFICIENT_DATA' as OverallVerdict)
                  ? 'No points available — add a card and bucket to enable rewards.'
                  : 'No points available for this amount.'}
              </span>
            )}
            <ButtonLink href="/sessions" variant="ghost" size="sm" className="text-[#ffe6ee]">
              View sessions →
            </ButtonLink>
            {confirmResult !== null ? (
              <p className="text-sm text-[#dbe4ff]">
                Awarded {confirmResult.pointsAwarded} pts
                {confirmResult.totalPoints != null
                  ? ` • Balance ${confirmResult.totalPoints} pts`
                  : ''}
              </p>
            ) : null}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
