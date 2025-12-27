'use client'

import { useEffect, useMemo, useRef, useState, type FormEvent, type JSX } from 'react';
import { PageHeader } from '../../../components/ui/page-header';
import { Panel } from '../../../components/ui/panel';
import { Card } from '../../../components/ui/card';
import { Button, ButtonLink } from '../../../components/ui/Button';
import { Alert } from '../../../components/ui/alert';
import { EmptyState } from '../../../components/ui/empty-state';
import { Skeleton } from '../../../components/ui/skeleton';
import type { LegacyEngineDecision } from '../../../lib/engine';
import type { ScanResponse } from '../../../lib/schemas/scan';
import { ScanResponseSchema } from '../../../lib/schemas/scan';
import { callApi } from '../../../lib/client/api';
import { useApiAction } from '../../../lib/client/useApiAction';
import { ErrorBanner } from '../../../components/ErrorBanner';
import { hasText } from '../../../lib/text';
import { isNonNegativeNumber, isPositiveNumber } from '../../../lib/numbers';
import { logGuardrailEvent, logInvariantViolation } from '../../../lib/log';

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
  decision: LegacyEngineDecision;
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
  'w-full rounded-lg border border-[rgba(27,38,69,0.6)] bg-[#0b1021] px-3 py-2 text-sm text-[#f8fafc] placeholder:text-[#a5b0d0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff6b8a]';

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
    decision: api.engineDecision as LegacyEngineDecision,
  };
}

export default function ScanClient({ nowMs }: { nowMs?: number }): JSX.Element {
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
  const perfStartMsRef = useRef<number>(0);

  const initialNowMs = useMemo(() => {
    if (typeof nowMs === 'number') return nowMs;
    if (typeof performance !== 'undefined' && typeof performance.timeOrigin === 'number') {
      return performance.timeOrigin;
    }
    return 0;
  }, [nowMs]);

  const currentMs = useMemo(
    () => () => initialNowMs + (typeof performance !== 'undefined' ? performance.now() - perfStartMsRef.current : 0),
    [initialNowMs]
  );

  const formattedCountdown = useMemo(() => {
    if (countdownSeconds == null) return '';
    const mins = Math.floor(countdownSeconds / 60);
    const secs = countdownSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, [countdownSeconds]);

  useEffect(() => {
    if (typeof performance !== 'undefined') {
      perfStartMsRef.current = performance.now();
    }
  }, []);

  useEffect(() => {
    if (sessionState === null || countdownSeconds == null) return;
    const id = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev == null) return prev;
        if (prev <= 1) {
          setSessionState((s) => (s !== null ? { ...s, status: 'EXPIRED' } : s));
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
    const inputEl = merchantInputRef.current;
    if (inputEl !== null) {
      inputEl.focus();
      inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setScanPreview(null);
    setSessionState(null);
    setCountdownSeconds(null);

    const merchantNameTrimmed = merchantName.trim();
    if (!hasText(merchantNameTrimmed)) {
      setError('Enter a merchant name.');
      logGuardrailEvent({
        userId: null,
        surface: 'scan',
        outcome: 'STOP',
        reason: 'MISSING_MERCHANT',
        timestamp: new Date(currentMs()).toISOString(),
        timestampSource: 'client',
      });
      return;
    }

    const amountInput = amount.trim();
    const parsedAmount = Number.parseFloat(amountInput);
    const hasValidAmount = Number.isFinite(parsedAmount) && isNonNegativeNumber(parsedAmount);
    if (!hasValidAmount) {
      setError('Enter an amount of 0 or more.');
      logGuardrailEvent({
        userId: null,
        surface: 'scan',
        outcome: 'STOP',
        reason: 'INVALID_AMOUNT',
        timestamp: new Date(currentMs()).toISOString(),
        timestampSource: 'client',
      });
      return;
    }
    const expectedAmountCents = Math.round(parsedAmount * 100);

    const categoryTrimmed = category.trim();
    const payload = {
      merchantName: merchantNameTrimmed,
      expectedAmountCents,
      category: hasText(categoryTrimmed) ? categoryTrimmed : null,
    };

    const result = await runScan(() =>
      callApi<ScanResponse>('/api/scan', {
        method: 'POST',
        body: JSON.stringify(payload),
        responseSchema: ScanResponseSchema,
      })
    );

    if (!result.ok) {
      setError(result.message);
      logGuardrailEvent({
        userId: null,
        surface: 'scan',
        outcome: 'FALLBACK',
        reason: 'SCAN_API_ERROR',
        detail: { code: result.error, message: result.message },
        timestamp: new Date(currentMs()).toISOString(),
        timestampSource: 'client',
      });
      return;
    }

    const preview = mapScanResponseToPreview(result.data, payload);
    setScanPreview(preview);
  }

  async function startSession() {
    if (scanPreview === null) {
      logGuardrailEvent({
        userId: null,
        surface: 'scan',
        outcome: 'STOP',
        reason: 'START_WITHOUT_PREVIEW',
        timestamp: new Date(currentMs()).toISOString(),
        timestampSource: 'client',
      });
      return;
    }
    if (scanPreview.isSnapshot || !isPositiveNumber(scanPreview.amountCents)) {
      setError('Set an amount above 0 to open a session.');
      logGuardrailEvent({
        userId: null,
        surface: 'scan',
        outcome: 'STOP',
        reason: 'SNAPSHOT_SESSION_BLOCK',
        timestamp: new Date(currentMs()).toISOString(),
        timestampSource: 'client',
      });
      return;
    }
    setIsStartingSession(true);
    setError(null);

    const result = await callApi<{
      sessionId: string;
      orderToken: string;
      expiresAt: string;
    }>('/api/sessions', {
      method: 'POST',
      body: JSON.stringify({
        merchantName:
          scanPreview.merchantName ?? (hasText(merchantName) ? merchantName.trim() : undefined),
        amountCents: scanPreview.amountCents,
        category: scanPreview.category ?? undefined,
      }),
    });

    if (!result.ok) {
      setError(result.message);
      setIsStartingSession(false);
      return;
    }

    const remainingSec = Math.max(
      0,
      Math.floor((new Date(result.data.expiresAt).getTime() - currentMs()) / 1000),
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
    setIsStartingSession(false);
  }

  async function confirmSession() {
    if (sessionState === null || scanPreview === null) {
      logGuardrailEvent({
        userId: null,
        surface: 'scan',
        outcome: 'STOP',
        reason: 'CONFIRM_WITHOUT_SESSION',
        timestamp: new Date(currentMs()).toISOString(),
        timestampSource: 'client',
      });
      return;
    }
    if (!hasText(scanPreview.decision.card.cardId)) {
      logInvariantViolation({
        surface: 'scan',
        detail: 'Missing cardId when confirming session',
        data: { decision: scanPreview.decision },
        timestamp: new Date(currentMs()).toISOString(),
      });
      setError('Unable to confirm session');
      return;
    }
    if (!isPositiveNumber(scanPreview.amountCents)) {
      logGuardrailEvent({
        userId: null,
        surface: 'scan',
        outcome: 'STOP',
        reason: 'INVALID_SESSION_AMOUNT',
        timestamp: new Date(currentMs()).toISOString(),
        timestampSource: 'client',
      });
      setError('Enter a positive amount to confirm the session.');
      return;
    }
    if (sessionState.status !== 'OPEN') {
      logGuardrailEvent({
        userId: null,
        surface: 'scan',
        outcome: 'WARN',
        reason: 'CONFIRM_IN_NON_OPEN_STATE',
        timestamp: new Date(currentMs()).toISOString(),
        timestampSource: 'client',
      });
      return;
    }
    setIsConfirming(true);
    setError(null);
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
      setError(result.message);
      setIsConfirming(false);
      return;
    }

    setSessionState((prev) => (prev !== null ? { ...prev, status: 'CLAIMED' } : prev));
    setIsConfirming(false);
  }

  const formatCents = (cents: number | null | undefined) => {
    if (cents == null) return '—';
    return `$${(cents / 100).toFixed(2)}`;
  };

  const renderResultBody = (): JSX.Element | null => {
    if (isScanning) {
      return (
        <Card tone="muted" padding="md">
          <Skeleton className="h-24 w-full" />
        </Card>
      );
    }

    if (scanPreview === null && !hasText(error)) {
      return (
        <EmptyState
          title="No manual lookup yet"
          description="Describe a merchant, amount, and optional category, then run a scan to see how Cherry would route the swipe."
          actionLabel="Run a lookup"
          onAction={focusMerchantField}
        />
      );
    }

    if (scanPreview === null && hasText(error)) {
      return (
        <EmptyState
          variant="error"
          title="Lookup failed"
          description={error}
        />
      );
    }

    if (scanPreview === null) return null;

    const hasCard = hasText(scanPreview.recommendedCardName);
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
        <Card tone="muted" padding="md" className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-[0.12em] text-[#c3cce5]">Advisory preview</p>
            <p className="text-lg font-semibold text-[#f8fafc]">
              {scanPreview.category ?? 'UNCATEGORIZED'} · {formatCents(scanPreview.amountCents)} ·{' '}
              {hasText(scanPreview.bucketName) ? scanPreview.bucketName : 'No bucket'}
            </p>
            <p className="text-sm text-[#c3cce5]">
              Stateless preview. Start a session to track and earn points.
            </p>
          </div>
          <span className="rounded-full border border-[rgba(27,38,69,0.6)] bg-[rgba(17,26,47,0.7)] px-3 py-1 text-xs font-semibold text-[#eef2fb]">
            {scanPreview.bucketVerdict}
          </span>
        </Card>

        {hasText(error) ? (
          <Alert variant="danger" title="Lookup issue" description={error} />
        ) : null}

        {hasCard ? (
          <Card tone="muted" padding="md" className="flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-xs text-[#a5b0d0]">Recommended card</p>
              <p className="text-sm font-semibold text-[#f8fafc]">
                {scanPreview.recommendedCardName ?? 'No card on file'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#a5b0d0]">Estimated rewards</p>
              <p className="text-sm font-semibold text-[#ffe6ee]">
                {scanPreview.recommendedRewardLabel ?? '—'}
              </p>
            </div>
          </Card>
        ) : (
          <EmptyState
            title="No rewards match found"
            description="Cherry could not find a card with a clear rewards advantage for this swipe. You can still review bucket impact and start a session."
          />
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <Card tone="muted" padding="md" className="space-y-1">
            <p className="text-xs font-semibold text-[#c3cce5]">Advisory points</p>
            <p className="text-lg font-semibold text-[#f8fafc]">
              {scanPreview.isSnapshot
                ? '0 pts (snapshot only)'
                : `${scanPreview.advisoryPoints} pts`}
            </p>
            <p className="text-xs text-[#a5b0d0]">
              {scanPreview.isSnapshot
                ? 'Set amount above 0 to earn points.'
                : 'Earned if you follow the recommendation.'}
            </p>
          </Card>
          <Card tone="muted" padding="md" className="space-y-1">
            <p className="text-xs font-semibold text-[#c3cce5]">Bucket impact</p>
            <p className="text-sm text-[#dbe4ff]">
              {hasText(scanPreview.bucketName) ? scanPreview.bucketName : 'No bucket matched'}
            </p>
            {bucketUsagePercent != null ? (
              <p className="text-xs text-[#a5b0d0]">
                Used {bucketUsagePercent.toFixed(0)}% ·{' '}
                {bucketRemaining != null ? `${formatCents(bucketRemaining)} left` : null}
              </p>
            ) : (
              <p className="text-xs text-[#a5b0d0]">
                {scanPreview.bucketBudgetCents != null
                  ? 'No spend recorded yet.'
                  : 'No tracked balances for this category.'}
              </p>
            )}
          </Card>
        </div>

        {sessionState === null ? (
          <Card tone="muted" padding="md" className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              onClick={startSession}
              disabled={isStartingSession || scanPreview.isSnapshot}
              variant="primary"
            >
              {isStartingSession ? 'Starting session…' : 'Start session & earn points'}
            </Button>
            {scanPreview.isSnapshot ? (
              <span className="text-xs text-[#a5b0d0]">
                Snapshot only — set an amount to open a session.
              </span>
            ) : (
              <span className="text-xs text-[#a5b0d0]">
                Sessions let you claim Cherry Points for following the recommendation.
              </span>
            )}
          </Card>
        ) : (
          <Card tone="muted" padding="md" className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#dbe4ff]">
              <span className="rounded-full border border-[rgba(27,38,69,0.6)] bg-[rgba(17,26,47,0.7)] px-2 py-1 font-semibold">
                Session ID: {sessionState.id}
              </span>
              <span className="rounded-full border border-[rgba(27,38,69,0.6)] bg-[rgba(17,26,47,0.7)] px-2 py-1 font-semibold">
                Order token: {sessionState.orderToken}
              </span>
              <span className="rounded-full border border-[rgba(27,38,69,0.6)] bg-[rgba(17,26,47,0.7)] px-2 py-1 font-semibold">
                Expires in: {formattedCountdown.length > 0 ? formattedCountdown : '—'}
              </span>
              <span className="rounded-full border border-[rgba(27,38,69,0.6)] bg-[rgba(17,26,47,0.7)] px-2 py-1 font-semibold">
                Status: {sessionState.status}
              </span>
            </div>
            <p className="text-xs text-[#c3cce5]">
              1) Pay with your recommended card. 2) Tap “I used this card” to claim. 3) Use Bank
              Simulator to post points.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                onClick={confirmSession}
                disabled={isConfirming || sessionState.status !== 'OPEN'}
                variant="secondary"
              >
                {isConfirming ? 'Submitting…' : 'I used this card'}
              </Button>
              <ButtonLink href="/bank-simulator" variant="ghost" size="sm" className="text-[#ffe6ee]">
                Open Bank Simulator
              </ButtonLink>
              <ButtonLink href="/sessions" variant="ghost" size="sm" className="text-[#dbe4ff]">
                View in Sessions/Activity
              </ButtonLink>
            </div>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader
        label="Engine"
        badge="Dev / Lab Tool"
        title="Scan Tool"
        description="Internal engine-lab scanner for inspection and debugging. Stateless preview; start a session to track points."
        actions={
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/sessions" variant="secondary" size="sm">
              Sessions
            </ButtonLink>
            <ButtonLink href="/bank-simulator" variant="ghost" size="sm" className="text-[#ffe6ee]">
              Bank simulator
            </ButtonLink>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <Panel
          tone="muted"
          title="Scan input"
          description="Describe a hypothetical swipe for Cherry to evaluate. Use amount 0 for a bucket snapshot."
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-sm text-[#c3cce5]">Merchant name</span>
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
                <span className="text-sm text-[#c3cce5]">Amount (USD)</span>
                <input
                  className={inputClass}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="24.50"
                  type="number"
                  min="0"
                  step="0.01"
                />
                <p className="text-xs text-[#a5b0d0]">Enter 0 for a bucket snapshot (no points).</p>
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="text-sm text-[#c3cce5]">Category (optional)</span>
                <input
                  className={inputClass}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="DINING"
                />
                <p className="text-xs text-[#a5b0d0]">
                  Optional. Helps Cherry disambiguate when MCC metadata is missing.
                </p>
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={isScanning}>
                {isScanning ? 'Looking up…' : 'Manual lookup & rewards'}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={reset}>
                Reset
              </Button>
            </div>
            <ErrorBanner message={error} />
          </form>
        </Panel>

        <Panel
          tone="muted"
          title="Engine output"
          description="Recommended card, projected rewards, and bucket impact for this context."
        >
          <div className="space-y-3">{renderResultBody()}</div>
        </Panel>
      </div>
    </div>
  );
}
