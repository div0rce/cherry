'use client';

import { useRouter } from 'next/navigation';
import { useState, FormEvent } from 'react';

export function DeleteBucketButton({ bucketId }: { bucketId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);

  async function handleDelete() {
    const confirmed = window.confirm('Delete this bucket?');
    if (!confirmed) return;

    setStatus('Removing…');
    const res = await fetch(`/api/buckets/${bucketId}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const message = await res.text();
      setStatus(message || 'Failed to delete bucket');
      return;
    }

    setStatus(null);
    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      className="text-sm text-red-600 hover:text-red-700"
      type="button"
    >
      Delete
      {status && <span className="ml-2 text-xs text-slate-500">{status}</span>}
    </button>
  );
}

export function AddBucketForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('DINING');
  const [period, setPeriod] = useState<'WEEKLY' | 'MONTHLY'>('WEEKLY');
  const [budgetDollars, setBudgetDollars] = useState('');
  const [currentDollars, setCurrentDollars] = useState('');
  const [strictMode, setStrictMode] = useState(true);
  const [status, setStatus] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!name.trim()) {
      setStatus('Name is required.');
      return;
    }
    if (!category.trim()) {
      setStatus('Category is required.');
      return;
    }
    const parsedBudget = Number.parseFloat(budgetDollars);
    if (!Number.isFinite(parsedBudget) || parsedBudget <= 0) {
      setStatus('Budget must be a number > 0.');
      return;
    }

    let currentCents: number | undefined;
    if (currentDollars.trim() !== '') {
      const parsedCurrent = Number.parseFloat(currentDollars);
      if (!Number.isFinite(parsedCurrent) || parsedCurrent < 0) {
        setStatus('Current amount must be a non-negative number.');
        return;
      }
      currentCents = Math.round(parsedCurrent * 100);
    }

    const budgetCents = Math.round(parsedBudget * 100);

    setStatus('Saving…');
    const res = await fetch('/api/buckets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        period,
        budgetAmountCents: budgetCents,
        currentAmountCents: currentCents,
        strictMode,
        category: category.toUpperCase(),
      }),
    });

    if (!res.ok) {
      const message = await res.text();
      setStatus(message || 'Failed to create bucket');
      return;
    }

    setName('');
    setCategory('DINING');
    setPeriod('WEEKLY');
    setBudgetDollars('');
    setCurrentDollars('');
    setStrictMode(true);
    setStatus('Created!');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-700">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          placeholder="Food"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-700">Category</label>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value.toUpperCase())}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="DINING"
            required
          />
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-700">Period</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as 'WEEKLY' | 'MONTHLY')}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            required
          >
            <option value="WEEKLY">WEEKLY</option>
            <option value="MONTHLY">MONTHLY</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-700">Budget (USD)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={budgetDollars}
            onChange={(e) => setBudgetDollars(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="200.00"
            required
          />
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-700">
            Current amount (USD, optional)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={currentDollars}
            onChange={(e) => setCurrentDollars(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="200.00"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          id="strictMode"
          type="checkbox"
          checked={strictMode}
          onChange={(e) => setStrictMode(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="strictMode" className="text-sm text-slate-700">
          Strict mode (decline when bucket is empty)
        </label>
      </div>
      <button
        type="submit"
        className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
      >
        Create bucket
      </button>
      {status && <p className="text-xs text-slate-600">{status}</p>}
    </form>
  );
}
