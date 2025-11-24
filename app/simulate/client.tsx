'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export function RunSimulationForm() {
  const router = useRouter();
  const [amountDollars, setAmountDollars] = useState('');
  const [category, setCategory] = useState('DINING');
  const [merchantName, setMerchantName] = useState('');
  const [mccCode, setMccCode] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!amountDollars.trim()) {
      setStatus('Amount is required.');
      return;
    }

    const parsedAmount = Number.parseFloat(amountDollars);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setStatus('Amount must be a number > 0.');
      return;
    }

    if (!category.trim()) {
      setStatus('Category is required.');
      return;
    }

    // mcc optional
    let mcc: number | undefined;
    if (mccCode.trim()) {
      const parsedMcc = Number.parseInt(mccCode, 10);
      if (!Number.isInteger(parsedMcc) || String(parsedMcc).length !== 4) {
        setStatus('MCC must be a 4-digit number.');
        return;
      }
      mcc = parsedMcc;
    }

    setStatus('Running…');

    const amountCents = Math.round(parsedAmount * 100);

    const res = await fetch('/api/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amountCents,
        category,
        merchantName: merchantName || undefined,
        mccCode: mcc,
      }),
    });

    if (!res.ok) {
      const message = await res.text();
      setStatus(message || 'Simulation failed');
      return;
    }

    setStatus('Done!');
    setMerchantName('');
    setMccCode('');
    setAmountDollars('');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">Amount (USD)</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={amountDollars}
          onChange={(e) => setAmountDollars(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          placeholder="30.00"
          required
        />
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">Category</label>
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value.toUpperCase())}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          placeholder="DINING"
          required
        />
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">Merchant (optional)</label>
        <input
          value={merchantName}
          onChange={(e) => setMerchantName(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          placeholder="Chipotle"
        />
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">MCC (optional)</label>
        <input
          value={mccCode}
          onChange={(e) => setMccCode(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          placeholder="5812"
          inputMode="numeric"
          pattern="\\d*"
        />
      </div>
      <button
        type="submit"
        className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
      >
        Simulate
      </button>
      {status && <p className="text-xs text-slate-600">{status}</p>}
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
