"use client";

import { useMemo, useState } from 'react';
import type { JSX } from 'react';
import Button from '@/components/user/ui/Button';
import Card from '@/components/user/ui/Card';
import Input from '@/components/user/ui/Input';
import Label from '@/components/user/ui/Label';
import type { AutopilotDecision } from '@/lib/engine/public-types';
import { hasText } from '@/lib/text';

type FormError = {
  field: 'merchant' | 'amount' | 'form';
  message: string;
};

function centsToDollars(cents: number | null | undefined): string {
  if (!Number.isFinite(cents ?? NaN)) return '—';
  return `$${((cents as number) / 100).toFixed(2)}`;
}

function parseAmountCents(input: string): number | null {
  const parsed = Number(input);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed * 100);
}

export default function AutopilotClient(): JSX.Element {
  const [merchant, setMerchant] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [decision, setDecision] = useState<AutopilotDecision | null>(null);
  const [formError, setFormError] = useState<FormError | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitMessage, setCommitMessage] = useState<string | null>(null);

  const parsedAmountCents = useMemo(() => parseAmountCents(amountInput), [amountInput]);
  const isFormValid = hasText(merchant) && parsedAmountCents !== null;
  const showPreviewDisabled = !isFormValid || isSubmitting || isCommitting;

  async function handlePreview(): Promise<void> {
    setFormError(null);
    setCommitMessage(null);
    const normalizedMerchant = merchant.trim();
    const amountCents = parsedAmountCents;
    if (!hasText(normalizedMerchant)) {
      setFormError({ field: 'merchant', message: 'Merchant is required.' });
      return;
    }
    if (amountCents === null) {
      setFormError({ field: 'amount', message: 'Enter a positive amount.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/autopilot/preview', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ merchant: normalizedMerchant, amountCents }),
      });

      const payload = (await response.json()) as AutopilotDecision & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? 'Unable to fetch recommendation.');
      }
      setDecision(payload);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to fetch a recommendation right now.';
      setFormError({ field: 'form', message });
      setDecision(null);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCommit(): Promise<void> {
    if (!decision || decision.kind !== 'OK' || !hasText(decision.cardId)) return;
    const normalizedMerchant = merchant.trim();
    const amountCents = parsedAmountCents;
    if (!hasText(normalizedMerchant) || amountCents === null) return;

    setIsCommitting(true);
    setCommitMessage(null);
    setFormError(null);
    try {
      const response = await fetch('/api/autopilot/commit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          merchant: normalizedMerchant,
          amountCents,
          cardId: decision.cardId,
          occurredAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Unable to save this swipe.');
      }

      setCommitMessage('Saved. We noted this swipe for your budgets.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save this swipe.';
      setFormError({ field: 'form', message });
    } finally {
      setIsCommitting(false);
    }
  }

  const benefitText =
    decision && decision.expectedMonetaryBenefitCents > 0
      ? `About $${(decision.expectedMonetaryBenefitCents / 100).toFixed(2)} better than your next best card.`
      : 'No expected savings difference versus your other cards.';

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#ef4444]">
              Cherry Autopilot
            </p>
            <p className="text-sm text-[#4b5563]">
              Tell us where you’re about to swipe. We’ll suggest a card and record the impact.
            </p>
          </div>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                name="amount"
                value={amountInput}
                placeholder="42.50"
                inputMode="decimal"
                onChange={(event) => setAmountInput(event.target.value)}
                disabled={isSubmitting || isCommitting}
                hasError={formError?.field === 'amount'}
              />
              {formError?.field === 'amount' ? (
                <p className="text-sm text-[#b91c1c]">{formError.message}</p>
              ) : null}
            </div>
            <div className="space-y-1">
              <Label htmlFor="merchant">Merchant</Label>
              <Input
                id="merchant"
                name="merchant"
                value={merchant}
                placeholder="Coffee Bar"
                onChange={(event) => setMerchant(event.target.value)}
                disabled={isSubmitting || isCommitting}
                hasError={formError?.field === 'merchant'}
              />
              {formError?.field === 'merchant' ? (
                <p className="text-sm text-[#b91c1c]">{formError.message}</p>
              ) : null}
            </div>
            <Button
              type="button"
              onClick={handlePreview}
              loading={isSubmitting}
              disabled={showPreviewDisabled}
              className="w-full"
            >
              Get recommendation
            </Button>
            {formError?.field === 'form' ? (
              <p className="text-sm text-[#b91c1c]">{formError.message}</p>
            ) : null}
          </div>
        </div>
      </Card>

      {decision ? (
        <Card
          className="space-y-3 p-4"
          aria-live="polite"
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                Recommendation
              </p>
              <p className="text-lg font-semibold text-[#111827]">
                {decision.kind === 'OK'
                  ? 'Use this card'
                  : decision.kind === 'BLOCKED'
                    ? 'Guardrails block this swipe'
                    : 'No clear choice'}
              </p>
            </div>
            <span
              className={
                decision.kind === 'OK'
                  ? 'rounded-full bg-[#dcfce7] px-3 py-1 text-xs font-semibold text-[#166534]'
                  : decision.kind === 'BLOCKED'
                    ? 'rounded-full bg-[#fee2e2] px-3 py-1 text-xs font-semibold text-[#b91c1c]'
                    : 'rounded-full bg-[#f3f4f6] px-3 py-1 text-xs font-semibold text-[#6b7280]'
              }
            >
              {decision.kind}
            </span>
          </div>

          <p className="text-sm text-[#1f2937]">{decision.userFacingMessage}</p>

          {decision.kind === 'OK' ? (
            <div className="space-y-2">
              <p className="text-sm text-[#b91c1c]">{benefitText}</p>
              {decision.bucketDelta ? (
                <p className="text-sm text-[#4b5563]">
                  Bucket impact: spent {centsToDollars(decision.bucketDelta.newSpentCents)} • remaining{' '}
                  {centsToDollars(decision.bucketDelta.newRemainingCents)}.
                </p>
              ) : (
                <p className="text-sm text-[#4b5563]">We did not detect a bucket change here.</p>
              )}
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  onClick={handleCommit}
                  loading={isCommitting}
                  disabled={isCommitting}
                  className="w-full sm:w-auto"
                >
                  I used this
                </Button>
              </div>
              {commitMessage !== null ? (
                <p className="text-sm text-[#16a34a]">{commitMessage}</p>
              ) : null}
            </div>
          ) : null}

          {decision.kind === 'BLOCKED' ? (
            <p className="text-sm font-semibold text-[#b91c1c]">
              This would break a guardrail. Skip or adjust the purchase.
            </p>
          ) : null}

          {decision.kind === 'FALLBACK' ? (
            <p className="text-sm text-[#6b7280]">
              We could not compute a safe recommendation. Use your usual card this time.
            </p>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}
