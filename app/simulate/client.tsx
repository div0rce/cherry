'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

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

export function RunSimulationForm() {
  const router = useRouter();
  const [amountDollars, setAmountDollars] = useState('');
  const [category, setCategory] = useState('DINING');
  const [merchantName, setMerchantName] = useState('');
  const [mccCode, setMccCode] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [errors, setErrors] = useState<{
    amount?: string;
    category?: string;
    mcc?: string;
  }>({});
  const [submitting, setSubmitting] = useState(false);

  const categoriesLabel = useMemo(() => VALID_CATEGORIES.join(', '), []);
  const inputClass =
    'w-full rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-pink-500 focus:outline-none';

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const fieldErrors: typeof errors = {};

    if (!amountDollars.trim()) {
      fieldErrors.amount = 'Amount is required.';
    }

    const parsedAmount = Number.parseFloat(amountDollars);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      fieldErrors.amount = 'Amount must be a number > 0.';
    }

    const normalizedCategory = category.trim().toUpperCase();
    if (!normalizedCategory) {
      fieldErrors.category = 'Category is required.';
    } else if (!VALID_CATEGORIES.includes(normalizedCategory)) {
      fieldErrors.category = `Category must be one of: ${categoriesLabel}`;
    }

    // mcc optional
    let mcc: number | undefined;
    if (mccCode.trim()) {
      const parsedMcc = Number.parseInt(mccCode, 10);
      if (!Number.isInteger(parsedMcc) || String(parsedMcc).length !== 4) {
        fieldErrors.mcc = 'MCC must be a 4-digit number.';
      }
      mcc = parsedMcc;
    }

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      setStatus('Fix the errors above.');
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
          merchantName: merchantName || undefined,
          mccCode: mcc,
        }),
      });

      if (res.status === 401) {
        promptSignIn(setStatus);
        return;
      }

      if (!res.ok) {
        const contentType = res.headers.get('content-type') || '';
        let message = 'Simulation failed';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          const details = Array.isArray(data?.details) ? data.details.join('; ') : null;
          if (data?.error) {
            message = details ? `${data.error}: ${details}` : data.error;
          }
        } else {
          const text = await res.text();
          if (text) message = text;
        }
        setStatus(`(${res.status}) ${message}`);
        return;
      }

      setStatus('Done!');
      setMerchantName('');
      setMccCode('');
      setAmountDollars('');
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
          min="0"
          step="0.01"
          value={amountDollars}
          onChange={(e) => setAmountDollars(e.target.value)}
          className={`${inputClass} ${errors.amount ? 'border-red-500' : ''}`}
          placeholder="30.00"
          required
        />
        {errors.amount && <p className="text-xs text-red-400">{errors.amount}</p>}
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-300">Category</label>
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value.toUpperCase())}
          className={`${inputClass} ${errors.category ? 'border-red-500' : ''}`}
          placeholder="DINING"
          required
        />
        <p className="text-xs text-slate-500">Valid: {categoriesLabel}</p>
        {errors.category && <p className="text-xs text-red-400">{errors.category}</p>}
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-300">Merchant (optional)</label>
        <input
          value={merchantName}
          onChange={(e) => setMerchantName(e.target.value)}
          className={inputClass}
          placeholder="Chipotle"
        />
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-300">MCC (optional)</label>
        <input
          value={mccCode}
          onChange={(e) => setMccCode(e.target.value)}
          className={`${inputClass} ${errors.mcc ? 'border-red-500' : ''}`}
          placeholder="5812"
          inputMode="numeric"
          pattern="\\d*"
        />
        {errors.mcc && <p className="text-xs text-red-400">{errors.mcc}</p>}
      </div>
      <button
        type="submit"
        className="w-full rounded-md bg-pink-600 px-3 py-2 text-sm font-semibold text-white hover:bg-pink-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
        disabled={submitting}
      >
        {submitting ? 'Simulating…' : 'Simulate'}
      </button>
      {status && <p className="text-xs text-slate-400">{status}</p>}
    </form>
  );
}

export function DeleteSimulationButton({ simulationId }: { simulationId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);

  async function handleDelete() {
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
      setStatus(message || 'Failed to delete');
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
      {status && <span className="ml-1 text-slate-500">{status}</span>}
    </button>
  );
}
