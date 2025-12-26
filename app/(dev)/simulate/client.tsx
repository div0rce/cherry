'use client';

import type { JSX } from 'react';
import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { hasText } from '@/lib/text';
import { isPositiveNumber } from '@/lib/numbers';
import { logGuardrailEvent } from '@/lib/log';

function promptSignIn(setStatus: (message: string) => void) {
  setStatus('Sign in to continue.');
  void signIn(undefined, { callbackUrl: window.location.href });
}

const VALID_CATEGORIES = [
  'DINING',
  'GROCERIES',
  'GAS',
  'TRAVEL',
  'AIR_TRAVEL',
  'HOTEL',
  'CAR_RENTAL',
  'ONLINE_SHOPPING',
  'ENTERTAINMENT',
  'HEALTH',
  'UTILITIES',
  'GENERAL_MERCHANDISE',
  'OTHER',
];

export function RunSimulationForm(): JSX.Element {
  const router = useRouter();
  const [amountDollars, setAmountDollars] = useState('');
  const [category, setCategory] = useState('DINING');
  const [merchantName, setMerchantName] = useState('');
  const [mccCode, setMccCode] = useState('');
  const [commit, setCommit] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [errors, setErrors] = useState<{
    amount?: string;
    category?: string;
    mcc?: string;
    merchant?: string;
  }>({});
  const [submitting, setSubmitting] = useState(false);

  const categoriesLabel = useMemo(() => VALID_CATEGORIES.join(', '), []);
  const inputClass =
    'w-full rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-pink-500 focus:outline-none';
  const handleMccInput = (value: string): void => {
    const digitsOnly = value.replace(/\D/g, '').slice(0, 4);
    setMccCode(digitsOnly);
  };

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();

    const fieldErrors: typeof errors = {};

    const parsedAmount = Number.parseFloat(amountDollars);
    if (!Number.isFinite(parsedAmount) || !isPositiveNumber(parsedAmount)) {
      fieldErrors.amount = 'Amount must be a number > 0.';
    }

    const normalizedCategory = category.trim().toUpperCase();
    const hasCategory = hasText(normalizedCategory);
    if (!hasCategory) {
      fieldErrors.category = 'Category is required.';
    } else if (!VALID_CATEGORIES.includes(normalizedCategory)) {
      fieldErrors.category = `Category must be one of: ${categoriesLabel}`;
    }

    const merchantNameTrimmed = merchantName.trim();
    if (!hasText(merchantNameTrimmed)) {
      fieldErrors.merchant = 'Enter a merchant name.';
    }

    // mcc optional
    let mcc: number | undefined;
    if (hasText(mccCode.trim())) {
      const parsedMcc = Number.parseInt(mccCode.trim(), 10);
      if (!Number.isInteger(parsedMcc) || String(parsedMcc).length !== 4) {
        fieldErrors.mcc = 'MCC must be a 4-digit code present in the MCC mapping.';
      }
      mcc = parsedMcc;
    }

    const hasErrors = Object.values(fieldErrors).length > 0;
    if (hasErrors) {
      setErrors(fieldErrors);
      setStatus('Fix the errors above.');
      logGuardrailEvent({
        userId: null,
        surface: 'simulate',
        outcome: 'STOP',
        reason: 'INVALID_FORM',
        detail: fieldErrors,
      });
      return;
    }

    setErrors({});
    setStatus('Running…');
    setSubmitting(true);

    const amountCents = Math.round(parsedAmount * 100);

    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountCents,
          category: normalizedCategory,
          merchantName: merchantNameTrimmed,
          mccCode: mcc,
          ...(commit ? { commit: true } : {}),
        }),
      });

      if (res.status === 401) {
        promptSignIn(setStatus);
        return;
      }

      if (!res.ok) {
        const headerContentType = res.headers.get('content-type');
        const contentType = hasText(headerContentType) ? headerContentType : '';
        let message = 'Simulation failed';
        if (contentType.includes('application/json')) {
          const data = (await res.json()) as unknown;
          if (data !== null && typeof data === 'object') {
            const maybeDetails = (data as { details?: unknown }).details;
            const details =
              Array.isArray(maybeDetails) && maybeDetails.every((d) => typeof d === 'string')
                ? (maybeDetails as string[]).join('; ')
                : null;
            const maybeError = (data as { error?: unknown }).error;
            if (typeof maybeError === 'string') {
              message = hasText(details) ? `${maybeError}: ${details}` : maybeError;
            }
          }
        } else {
          const text = await res.text();
          if (hasText(text)) message = text;
        }
        setStatus(`(${res.status}) ${message}`);
        return;
      }

      setStatus('Done!');
      setMerchantName('');
      setMccCode('');
      setAmountDollars('');
      setCommit(false);
      router.refresh();
    } catch {
      setStatus('Network error: unable to run simulation.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 text-slate-100">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-300">Amount (USD)</label>
        <input
          type="number"
          min="0.01"
          step="0.01"
          value={amountDollars}
          onChange={(e) => setAmountDollars(e.target.value)}
          className={`${inputClass} ${hasText(errors.amount) ? 'border-red-500' : ''}`}
          placeholder="30.00"
          required
        />
        {hasText(errors.amount) ? <p className="text-xs text-red-400">{errors.amount}</p> : null}
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-300">Category</label>
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value.toUpperCase())}
          className={`${inputClass} ${hasText(errors.category) ? 'border-red-500' : ''}`}
          placeholder="DINING"
          required
        />
        <p className="text-xs text-slate-500">Valid: {categoriesLabel}</p>
        {hasText(errors.category) ? <p className="text-xs text-red-400">{errors.category}</p> : null}
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-300">Merchant</label>
        <input
          value={merchantName}
          onChange={(e) => setMerchantName(e.target.value)}
          className={`${inputClass} ${hasText(errors.merchant) ? 'border-red-500' : ''}`}
          placeholder="Chipotle"
          required
        />
        {hasText(errors.merchant) ? <p className="text-xs text-red-400">{errors.merchant}</p> : null}
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-300">MCC (optional)</label>
        <input
          type="text"
          value={mccCode}
          onChange={(e) => handleMccInput(e.target.value)}
          className={`${inputClass} ${hasText(errors.mcc) ? 'border-red-500' : ''}`}
          placeholder="5812"
          inputMode="numeric"
          maxLength={4}
          autoComplete="off"
        />
        <p className="text-xs text-slate-500">
          Enter a 4-digit MCC from the mapping (leading zeros allowed).
        </p>
        {hasText(errors.mcc) ? <p className="text-xs text-red-400">{errors.mcc}</p> : null}
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input
          type="checkbox"
          checked={commit}
          onChange={(e) => setCommit(e.target.checked)}
          className="h-4 w-4 rounded border border-white/20 bg-slate-900 text-pink-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-300"
        />
        <span className="text-xs text-slate-400">
          Apply to buckets (dev/local only). In production this is ignored.
        </span>
      </label>
      <button
        type="submit"
        className="w-full rounded-md bg-pink-600 px-3 py-2 text-sm font-semibold text-white hover:bg-pink-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
        disabled={submitting}
      >
        {submitting ? 'Simulating…' : 'Simulate'}
      </button>
      {status !== null ? <p className="text-xs text-slate-400">{status}</p> : null}
    </form>
  );
}

export function DeleteSimulationButton({
  simulationId,
}: {
  simulationId: string;
}): JSX.Element {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);

  async function handleDelete(): Promise<void> {
    const confirmed = window.confirm('Delete this simulation entry?');
    if (!confirmed) return;

    setStatus('Removing…');
    const res = await fetch(`/api/simulations/${simulationId}`, {
      method: 'DELETE',
    });

    if (res.status === 401) {
      promptSignIn(setStatus);
      return;
    }

    if (!res.ok) {
      const message = await res.text();
      setStatus(hasText(message) ? message : 'Failed to delete');
      return;
    }

    setStatus(null);
    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      className="text-xs text-red-600 hover:text-red-700"
      type="button"
    >
      Delete
      {status !== null ? <span className="ml-1 text-slate-500">{status}</span> : null}
    </button>
  );
}
