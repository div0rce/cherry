"use client";

import type { FormEvent, JSX } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/Input';
import { Panel } from '@/components/ui/panel';
import { Select } from '@/components/ui/Select';
import { ROUTES } from '@/lib/routes';
import {
  AUTOPILOT_REWARD_CATEGORIES,
  type AutopilotCommitResult,
  type AutopilotPreviewOutput,
} from '@/lib/autopilot/types';
import {
  appendRecentAutopilotDecision,
  loadRecentAutopilotDecisions,
  type StoredAutopilotDecision,
} from '@/lib/autopilot/recent-decisions';

type AutopilotClientProps = {
  userId: string;
};

function formatCurrency(cents: number | null | undefined): string {
  if (typeof cents !== 'number' || Number.isNaN(cents)) return '—';
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCategoryLabel(value: string): string {
  return value.replace(/_/g, ' ').toLowerCase().replace(/(^\w|\s\w)/g, (m) => m.toUpperCase());
}

function statusBadgeClass(status: AutopilotPreviewOutput['status']): string {
  if (status === 'ok') return 'border-mint-400/60 bg-mint-400/15 text-mint-100';
  if (status === 'blocked') return 'border-rose-500/60 bg-rose-500/15 text-rose-100';
  return 'border-amber-400/60 bg-amber-400/15 text-amber-50';
}

export default function AutopilotClient({ userId }: AutopilotClientProps): JSX.Element {
  const [merchant, setMerchant] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [category, setCategory] = useState<string>('');
  const [preview, setPreview] = useState<AutopilotPreviewOutput | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [commitError, setCommitError] = useState<string | null>(null);
  const [commitMessage, setCommitMessage] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isCommitLoading, setIsCommitLoading] = useState(false);
  const [recentDecisions, setRecentDecisions] = useState<StoredAutopilotDecision[]>([]);
  const [lastPreviewCategory, setLastPreviewCategory] = useState<string | null>(null);
  const [flowStep, setFlowStep] = useState<'intent' | 'confirm'>('intent');
  const [intentSnapshot, setIntentSnapshot] = useState<{
    merchant: string;
    amountCents: number;
    category: string | null;
  } | null>(null);

  useEffect(() => {
    void loadRecentAutopilotDecisions(userId).then((decisions) => {
      setRecentDecisions(decisions);
    });
  }, [userId]);

  const amountCents = useMemo(() => {
    const parsed = Number(amountInput);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return Math.round(parsed * 100);
  }, [amountInput]);

  const isFormValid = merchant.trim().length > 0 && amountCents !== null;

  useEffect(() => {
    if (!intentSnapshot) return;
    const alignedCategory = category !== '' ? category : null;
    if (
      merchant.trim() !== intentSnapshot.merchant ||
      amountCents !== intentSnapshot.amountCents ||
      alignedCategory !== intentSnapshot.category
    ) {
      setFlowStep('intent');
    }
  }, [merchant, amountCents, category, intentSnapshot]);

  async function handlePreview(event?: FormEvent): Promise<void> {
    event?.preventDefault();
    setPreviewError(null);
    setCommitError(null);
    setCommitMessage(null);
    setPreview(null);
    setIsPreviewLoading(true);

    const snapshot = intentSnapshot;

    if (!snapshot) {
      setPreviewError('Confirm the intent first.');
      setIsPreviewLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/autopilot/preview', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          merchant: snapshot.merchant,
          amountCents: snapshot.amountCents,
          ...(snapshot.category ? { category: snapshot.category } : {}),
          occurredAt: new Date().toISOString(),
        }),
      });

      const payload = (await response.json()) as AutopilotPreviewOutput & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? 'Unable to fetch a recommendation right now.');
      }
      setPreview(payload);
      setLastPreviewCategory(snapshot.category);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to fetch a recommendation right now.';
      setPreviewError(message);
      setPreview(null);
    } finally {
      setIsPreviewLoading(false);
    }
  }

  function handleIntentSubmit(event: FormEvent): void {
    event.preventDefault();
    setPreviewError(null);
    setCommitError(null);
    setCommitMessage(null);
    setPreview(null);

    if (!isFormValid || amountCents === null) {
      setPreviewError('Enter a merchant and a positive amount.');
      return;
    }

    setIntentSnapshot({
      merchant: merchant.trim(),
      amountCents,
      category: category !== '' ? category : null,
    });
    setFlowStep('confirm');
  }

  function formattedGuardrail(reasonCode: string): string {
    if (!reasonCode) return 'Guardrail applied';
    return reasonCode
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/(^\w|\s\w)/g, (segment) => segment.toUpperCase());
  }

  function renderBudgetMeter(): JSX.Element | null {
    if (!preview?.bucketImpact || preview.bucketImpact.remainingCents === null) return null;

    const remainingAfter = preview.bucketImpact.remainingCents;
    const spentAfter = preview.bucketImpact.spentCents ?? 0;
    const total = remainingAfter + spentAfter;
    if (total <= 0) return null;

    const spentBefore = Math.max(spentAfter - preview.amountCents, 0);

    const beforeSpentPct = Math.min((spentBefore / total) * 100, 100);
    const afterSpentPct = Math.min((spentAfter / total) * 100, 100);

    return (
      <div className="space-y-2 rounded-md border border-ink-700/60 bg-ink-900/60 p-3">
        <div className="flex items-center justify-between text-sm text-cloud-200">
          <span className="font-semibold">{preview.bucketImpact.name ?? 'Budget impact'}</span>
          <span className="text-cloud-300">Remaining after: {formatCurrency(remainingAfter)}</span>
        </div>
        <div className="space-y-1 text-xs text-cloud-300">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span>Before</span>
              <span>
                Spent {formatCurrency(spentBefore)} / {formatCurrency(total - spentBefore)} left
              </span>
            </div>
            <div className="h-2 rounded-full bg-ink-800">
              <div
                className="h-2 rounded-full bg-amber-400/80"
                style={{ width: `${beforeSpentPct}%` }}
              />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span>After</span>
              <span>
                Spent {formatCurrency(spentAfter)} / {formatCurrency(remainingAfter)} left
              </span>
            </div>
            <div className="h-2 rounded-full bg-ink-800">
              <div
                className="h-2 rounded-full bg-mint-400/80"
                style={{ width: `${afterSpentPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  async function handleCommit(): Promise<void> {
    if (!preview || preview.status !== 'ok' || !preview.recommendedCard) return;
    setCommitError(null);
    setCommitMessage(null);
    setIsCommitLoading(true);

    try {
      const response = await fetch('/api/autopilot/commit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          decisionId: preview.decisionId,
          merchant: preview.merchant,
          amountCents: preview.amountCents,
          cardId: preview.recommendedCard.id,
          occurredAt: preview.occurredAt,
          ...(lastPreviewCategory !== null ? { category: lastPreviewCategory } : {}),
        }),
      });

      const payload = (await response.json()) as AutopilotCommitResult & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? 'Unable to log this swipe.');
      }

      setCommitMessage(payload.status === 'already_exists' ? 'Already logged.' : 'Logged.');

      const next = await appendRecentAutopilotDecision(userId, {
        decisionId: preview.decisionId,
        merchant: preview.merchant,
        amountCents: preview.amountCents,
        cardLabel: preview.recommendedCard.label,
        occurredAt: preview.occurredAt,
        status: preview.status,
      });
      setRecentDecisions(next);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to log this swipe.';
      setCommitError(message);
    } finally {
      setIsCommitLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <Panel
        tone="muted"
        title="Set up your swipe"
        description="Share the merchant and amount. Cherry will run the engine and tee up the best card."
        padded
      >
        <form className="space-y-3" onSubmit={handleIntentSubmit}>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-cloud-200" htmlFor="merchant">
                Merchant
              </label>
              <Input
                id="merchant"
                name="merchant"
                placeholder="Coffee Bar"
                value={merchant}
                onChange={(event) => setMerchant(event.target.value)}
                disabled={isPreviewLoading || isCommitLoading}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-cloud-200" htmlFor="amount">
                Amount
              </label>
              <Input
                id="amount"
                name="amount"
                inputMode="decimal"
                placeholder="42.50"
                value={amountInput}
                onChange={(event) => setAmountInput(event.target.value)}
                disabled={isPreviewLoading || isCommitLoading}
                required
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-semibold text-cloud-200" htmlFor="category">
              Category (optional)
            </label>
            <Select
              id="category"
              name="category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              disabled={isPreviewLoading || isCommitLoading}
            >
              <option value="">Let Cherry infer it</option>
              {AUTOPILOT_REWARD_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {formatCategoryLabel(value)}
                </option>
              ))}
            </Select>
          </div>
          {previewError !== null ? (
            <Alert title="Could not run Autopilot" description={previewError} variant="danger" />
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-sm text-cloud-300">
              <Badge className="border-ink-700/60 bg-ink-900/60 text-cloud-200">Step 1 · Intent</Badge>
              <Badge
                className={
                  flowStep === 'confirm'
                    ? 'border-mint-400/60 bg-mint-400/15 text-mint-100'
                    : 'border-ink-700/60 bg-ink-900/60 text-cloud-300'
                }
              >
                {flowStep === 'confirm' ? 'Intent captured' : 'Share merchant + amount'}
              </Badge>
              <span className="text-cloud-300">Advisory only — you stay in control.</span>
            </div>
            <Button type="submit" disabled={!isFormValid || isPreviewLoading} aria-live="polite">
              {flowStep === 'confirm' ? 'Update intent' : 'Continue to confirm'}
            </Button>
          </div>
        </form>
      </Panel>

      {flowStep === 'confirm' && intentSnapshot ? (
        <Panel
          tone="base"
          title="Confirm and run Autopilot"
          description="Review your intent, acknowledge the guardrails, then fire the engine."
          actions={
            <div className="flex flex-wrap gap-2">
              <Badge className="border-mint-400/60 bg-mint-400/15 text-mint-100">Step 2 · Confirm</Badge>
              <Badge className="border-sky-400/60 bg-sky-400/15 text-sky-100">Advisory only</Badge>
              <Badge className="border-amber-400/60 bg-amber-400/15 text-amber-50">Safety-first</Badge>
            </div>
          }
        >
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 text-sm text-cloud-300">
              <span className="rounded-md border border-ink-700/60 bg-ink-900/60 px-2 py-1">
                Merchant: {intentSnapshot.merchant}
              </span>
              <span className="rounded-md border border-ink-700/60 bg-ink-900/60 px-2 py-1">
                Amount: {formatCurrency(intentSnapshot.amountCents)}
              </span>
              {intentSnapshot.category ? (
                <span className="rounded-md border border-ink-700/60 bg-ink-900/60 px-2 py-1">
                  Category: {formatCategoryLabel(intentSnapshot.category)}
                </span>
              ) : null}
            </div>
            <p className="text-sm text-cloud-300">
              Cherry stays advisory and transparent. You trigger the engine, review the card, and log the swipe when it feels
              right.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2 text-sm text-cloud-200">
                <Badge className="border-mint-400/60 bg-mint-400/15 text-mint-100">Intent locked in</Badge>
                <Badge className="border-amber-400/60 bg-amber-400/15 text-amber-50">Guardrails on</Badge>
              </div>
              <Button onClick={handlePreview} disabled={isPreviewLoading} aria-live="polite">
                {isPreviewLoading ? 'Running...' : 'Run Autopilot'}
              </Button>
            </div>
          </div>
        </Panel>
      ) : null}

      {preview ? (
        <Panel
          tone="base"
          title="Recommendation"
          description="Cherry picks from your saved cards. Commit it to keep your budgets aligned."
          actions={
            <Badge className={statusBadgeClass(preview.status)}>
              {preview.status === 'ok'
                ? 'Ready'
                : preview.status === 'blocked'
                  ? 'Blocked by guardrails'
                  : 'Fallback'}
            </Badge>
          }
        >
          <div className="space-y-2">
            <p className="text-base font-semibold text-cloud-50">{preview.explanation.primary}</p>
            {preview.recommendedCard ? (
              <p className="text-sm text-cloud-300">
                Recommended card: <span className="font-semibold">{preview.recommendedCard.label}</span>{' '}
                · {preview.recommendedCard.network ?? 'Network unknown'} ·{' '}
                {preview.recommendedCard.issuer ?? 'Issuer unknown'}
              </p>
            ) : (
              <p className="text-sm text-cloud-300">No specific card recommended for this swipe.</p>
            )}
            <div className="flex flex-wrap gap-2 text-sm text-cloud-300">
              <span className="rounded-md border border-ink-700/60 bg-ink-900/60 px-2 py-1">
                Merchant: {preview.merchant}
              </span>
              <span className="rounded-md border border-ink-700/60 bg-ink-900/60 px-2 py-1">
                Amount: {formatCurrency(preview.amountCents)}
              </span>
              <span className="rounded-md border border-ink-700/60 bg-ink-900/60 px-2 py-1">
                Expected benefit: {formatCurrency(preview.expectedBenefitCents)}
              </span>
            </div>
            {preview.explanation.secondary.length > 0 ? (
              <ul className="list-disc space-y-1 pl-5 text-sm text-cloud-200">
                {preview.explanation.secondary.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            ) : null}
            {preview.explanation.warnings.length > 0 || preview.reasonCode ? (
              <Alert
                variant={preview.status === 'blocked' ? 'danger' : 'warning'}
                title="Guardrails"
                description={`${formattedGuardrail(preview.reasonCode)}${preview.explanation.warnings.length > 0 ? `. ${preview.explanation.warnings.join(' ')}` : ''}`}
              />
            ) : null}
            {renderBudgetMeter() ?? (
              <div className="rounded-md border border-ink-700/60 bg-ink-900/60 p-3">
                <p className="text-sm text-cloud-300">No bucket impact detected for this swipe.</p>
              </div>
            )}
            {commitMessage !== null ? (
              <Alert title={commitMessage} variant="success" />
            ) : null}
            {commitError !== null ? (
              <Alert title="Could not log this swipe" description={commitError} variant="danger" />
            ) : null}
          </div>
          <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-cloud-300">
              Decision ID: <span className="font-mono text-cloud-100">{preview.decisionId}</span>
            </p>
            <Button
              onClick={handleCommit}
              disabled={preview.status !== 'ok' || isCommitLoading}
              aria-live="polite"
            >
              {isCommitLoading ? 'Logging...' : 'Commit / Log this'}
            </Button>
            <p className="text-xs text-cloud-300 sm:text-sm">
              People like you saved {formatCurrency(preview.expectedBenefitCents)} by following this lane last week.
            </p>
          </div>
        </Panel>
      ) : null}

      <Panel
        tone="muted"
        title="Recent decisions"
        description="Local-only history to remind you what you committed. Full history lives in the History tab."
        actions={<ButtonLink variant="secondary" href={ROUTES.user.history}>View history</ButtonLink>}
      >
        {recentDecisions.length === 0 ? (
          <EmptyState
            title="No recent Autopilot commits"
            description="Run Autopilot and commit a swipe to see it here."
          />
        ) : (
          <div className="space-y-3">
            {recentDecisions.map((entry) => (
              <Card
                key={entry.decisionId}
                tone="base"
                padding="md"
                className="flex flex-col gap-2 border border-ink-700/60 md:flex-row md:items-center md:justify-between"
              >
                <div className="space-y-1">
                  <p className="text-sm text-cloud-300">{formatDate(entry.occurredAt)}</p>
                  <p className="text-base font-semibold text-cloud-50">{entry.merchant}</p>
                  <p className="text-sm text-cloud-300">
                    {formatCurrency(entry.amountCents)} · {entry.cardLabel}
                  </p>
                </div>
                <Badge className={statusBadgeClass(entry.status)}>{entry.status}</Badge>
              </Card>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
