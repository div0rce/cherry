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

  async function handlePreview(event: FormEvent): Promise<void> {
    event.preventDefault();
    setPreviewError(null);
    setCommitError(null);
    setCommitMessage(null);
    setPreview(null);
    setIsPreviewLoading(true);

    if (!isFormValid || amountCents === null) {
      setPreviewError('Enter a merchant and a positive amount.');
      setIsPreviewLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/autopilot/preview', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          merchant: merchant.trim(),
          amountCents,
          ...(category !== '' ? { category } : {}),
          occurredAt: new Date().toISOString(),
        }),
      });

      const payload = (await response.json()) as AutopilotPreviewOutput & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? 'Unable to fetch a recommendation right now.');
      }
      setPreview(payload);
      setLastPreviewCategory(category !== '' ? category : null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to fetch a recommendation right now.';
      setPreviewError(message);
      setPreview(null);
    } finally {
      setIsPreviewLoading(false);
    }
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
        <form className="space-y-3" onSubmit={handlePreview}>
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
            <p className="text-sm text-cloud-300">
              Autopilot stays advisory: we recommend, you decide, and we log the impact.
            </p>
            <Button type="submit" disabled={!isFormValid || isPreviewLoading} aria-live="polite">
              {isPreviewLoading ? 'Running...' : 'Run Autopilot'}
            </Button>
          </div>
        </form>
      </Panel>

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
            {preview.explanation.warnings.length > 0 ? (
              <Alert
                variant={preview.status === 'blocked' ? 'danger' : 'warning'}
                title="Warnings"
                description={preview.explanation.warnings.join(' ')}
              />
            ) : null}
            <div className="rounded-md border border-ink-700/60 bg-ink-900/60 p-3">
              {preview.bucketImpact ? (
                <div className="text-sm text-cloud-200">
                  <p className="font-semibold">
                    Bucket: {preview.bucketImpact.name ?? 'Unspecified bucket'}
                  </p>
                  <p className="text-cloud-300">
                    Remaining after swipe: {formatCurrency(preview.bucketImpact.remainingCents)} · Spent:{' '}
                    {formatCurrency(preview.bucketImpact.spentCents)}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-cloud-300">No bucket impact detected for this swipe.</p>
              )}
            </div>
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
