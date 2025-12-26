'use client';

import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import { callApi } from '../../../lib/client/api.js';

const hasText = (value?: string | null): value is string =>
  value !== undefined && value !== null && value !== '';

type PendingSession = {
  id: string;
  merchantName: string | null;
  amountCents: number;
  category: string | null;
  createdAt: string;
  status: string;
  budgetVerdict: string;
  cardVerdict: string;
  overallVerdict: string;
  pendingPoints: number;
};

export default function BankSimulatorClient(): JSX.Element {
  const [sessions, setSessions] = useState<PendingSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadSessions() {
    setLoading(true);
    setError(null);
    const res = await callApi<{ sessions?: PendingSession[] }>('/api/dev/pending-sessions');
    if (!res.ok) {
      setError(res.message);
      setLoading(false);
      return;
    }
    setSessions(res.data.sessions ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void loadSessions();
  }, []);

  async function handleVerify(id: string, verified: boolean) {
    setActioningId(id);
    setError(null);
    const res = await callApi<unknown>(`/api/sessions/${id}/verify`, {
      method: 'POST',
      body: JSON.stringify({ verified }),
    });
    if (!res.ok) {
      setError(hasText(res.message) ? res.message : 'Failed to verify session');
      setActioningId(null);
      return;
    }
    await loadSessions();
    setActioningId(null);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 text-slate-100">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-pink-200">Dev Tool</p>
        <h1 className="text-3xl font-semibold text-white">Bank / Plaid Simulator</h1>
        <p className="text-sm text-slate-300">
          Simulate a <span className="font-semibold text-pink-300">Plaid-like bank feed</span> to
          flip claimed sessions with pending points into verified or rejected outcomes—no real bank
          data required.
        </p>
        <p className="text-xs text-slate-500">
          Real Plaid would detect bank transactions and call the same verify endpoint. This tool is
          a placeholder so you can exercise the full <span className="font-mono">CLAIMED → VERIFIED/REJECTED → POSTED/REVOKED</span>{' '}
          flow without any external integration.
        </p>
      </header>

      <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Pending Claims (ledger: PENDING)</h2>
          <button
            type="button"
            onClick={() => loadSessions()}
            disabled={loading}
            className="rounded-md bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-100 hover:bg-slate-700 disabled:opacity-60"
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
        {hasText(error) ? <p className="text-xs text-pink-300">{error}</p> : null}
        {sessions.length === 0 ? (
          <p className="text-xs text-slate-400">
            No claimed sessions with pending points. Trigger a recommendation and claim it first.
          </p>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/30 p-3 md:flex-row md:items-center md:justify-between"
              >
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-white">
                    {s.merchantName ?? 'Unknown merchant'} · ${(s.amountCents / 100).toFixed(2)}
                  </p>
                  <p className="text-xs text-slate-400">
                    Category: {s.category ?? 'N/A'} · Budget: {s.budgetVerdict} · Card:{' '}
                    {s.cardVerdict} · Overall: {s.overallVerdict}
                  </p>
                  <p className="text-xs text-slate-500">
                    Session: {s.status} · Pending points: {s.pendingPoints}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleVerify(s.id, true)}
                    disabled={actioningId === s.id}
                    className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {actioningId === s.id ? 'Verifying…' : 'Simulate bank match'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVerify(s.id, false)}
                    disabled={actioningId === s.id}
                    className="rounded-md bg-pink-700 px-3 py-1 text-xs font-semibold text-white hover:bg-pink-800 disabled:opacity-60"
                  >
                    {actioningId === s.id ? 'Rejecting…' : 'Simulate no match'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3 space-y-1">
        <h3 className="text-sm font-semibold text-white">What this is simulating</h3>
        <pre className="whitespace-pre-wrap text-xs leading-relaxed text-slate-400">
{`User claims "I used this card"
↓
Cherry creates CherryPointLedger row with status = PENDING
↓
(Real world) Plaid/bank feed sees a matching transaction
↓
Worker calls POST /api/sessions/[id]/verify
↓
Session: CLAIMED → VERIFIED or REJECTED
Ledger: PENDING → POSTED or REVOKED`}
        </pre>
        <p className="text-xs text-slate-500">
          This page is a stand-in for Plaid/bank reconciliation. It should never be exposed to end
          users.
        </p>
      </div>
    </div>
  );
}
