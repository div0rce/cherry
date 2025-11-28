'use client';

import type { JSX } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AdminClient(): JSX.Element {
  const router = useRouter();
  const [isSeeding, setIsSeeding] = useState(false);
  const [isClearingUser, setIsClearingUser] = useState(false);
  const [isClearingSessions, setIsClearingSessions] = useState(false);
  const [isClearingLedger, setIsClearingLedger] = useState(false);
  const [seedFeedback, setSeedFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [clearUserFeedback, setClearUserFeedback] = useState<
    { type: 'success' | 'error'; text: string } | null
  >(null);
  const [clearSessionsFeedback, setClearSessionsFeedback] = useState<
    { type: 'success' | 'error'; text: string } | null
  >(null);
  const [clearLedgerFeedback, setClearLedgerFeedback] = useState<
    { type: 'success' | 'error'; text: string } | null
  >(null);

  useEffect(() => {
    if (!seedFeedback) return;
    const id = setTimeout(() => setSeedFeedback(null), 3000);
    return () => clearTimeout(id);
  }, [seedFeedback]);

  useEffect(() => {
    if (!clearUserFeedback) return;
    const id = setTimeout(() => setClearUserFeedback(null), 3000);
    return () => clearTimeout(id);
  }, [clearUserFeedback]);

  useEffect(() => {
    if (!clearSessionsFeedback) return;
    const id = setTimeout(() => setClearSessionsFeedback(null), 3000);
    return () => clearTimeout(id);
  }, [clearSessionsFeedback]);

  useEffect(() => {
    if (!clearLedgerFeedback) return;
    const id = setTimeout(() => setClearLedgerFeedback(null), 3000);
    return () => clearTimeout(id);
  }, [clearLedgerFeedback]);

  async function callEndpoint(
    url: string,
    setLoading: (v: boolean) => void,
    successText: string,
    setFeedback: (value: { type: 'success' | 'error'; text: string } | null) => void
  ) {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(url, { method: 'POST' });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || 'Request failed');
      }
      setFeedback({ type: 'success', text: successText });
      router.refresh();
    } catch (error) {
      setFeedback({
        type: 'error',
        text: error instanceof Error ? error.message : 'Request failed',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-white/5 bg-white/5 p-4 shadow-lg">
      <h2 className="text-lg font-semibold text-white">Data Management</h2>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <div className="flex h-full flex-col gap-2 rounded-xl border border-white/5 bg-slate-900/40 p-3">
          <div>
            <p className="text-sm font-semibold text-white">Seed demo data</p>
            <p className="text-xs text-slate-400">
              Populate cards, buckets, sessions, and sample Cherry Points for this user.
            </p>
          </div>
          <div className="mt-auto space-y-1">
            <button
              type="button"
              onClick={() =>
                callEndpoint('/api/seed-demo', setIsSeeding, 'Seeded demo data', setSeedFeedback)
              }
              disabled={isSeeding}
              className="rounded-md bg-pink-600 px-3 py-2 text-sm font-semibold text-white hover:bg-pink-700 transition disabled:opacity-70"
            >
              {isSeeding ? 'Seeding…' : 'Seed demo data'}
            </button>
            <p
              className={`min-h-5 text-xs ${
                seedFeedback
                  ? seedFeedback.type === 'success'
                    ? 'text-green-300'
                    : 'text-red-300'
                  : 'text-slate-500'
              }`}
            >
              {seedFeedback?.text ?? ' '}
            </p>
          </div>
        </div>

        <div className="flex h-full flex-col gap-2 rounded-xl border border-white/5 bg-slate-900/40 p-3">
          <div>
            <p className="text-sm font-semibold text-white">Clear user data</p>
            <p className="text-xs text-slate-400">
              Delete cards, buckets, and simulations for the current user.
            </p>
          </div>
          <div className="mt-auto space-y-1">
            <button
              type="button"
              onClick={() =>
                callEndpoint(
                  '/api/admin/clear-user',
                  setIsClearingUser,
                  'Cleared user data',
                  setClearUserFeedback
                )
              }
              disabled={isClearingUser}
              className="rounded-md bg-pink-600 px-3 py-2 text-sm font-semibold text-white hover:bg-pink-700 transition disabled:opacity-70"
            >
              {isClearingUser ? 'Clearing…' : 'Clear user data'}
            </button>
            <p
              className={`min-h-5 text-xs ${
                clearUserFeedback
                  ? clearUserFeedback.type === 'success'
                    ? 'text-green-300'
                    : 'text-red-300'
                  : 'text-slate-500'
              }`}
            >
              {clearUserFeedback?.text ?? ' '}
            </p>
          </div>
        </div>

        <div className="flex h-full flex-col gap-2 rounded-xl border border-white/5 bg-slate-900/40 p-3">
          <div>
            <p className="text-sm font-semibold text-white">Clear Cherry Session Diagnostics</p>
            <p className="text-xs text-slate-400">
              Delete all Cherry recommendation sessions and their points for this user. Sandbox only.
            </p>
          </div>
          <div className="mt-auto space-y-1">
            <button
              type="button"
              onClick={() =>
                callEndpoint(
                  '/api/admin/clear-sessions',
                  setIsClearingSessions,
                  'Cleared sessions and ledger',
                  setClearSessionsFeedback
                )
              }
              disabled={isClearingSessions}
              className="rounded-md bg-pink-600 px-3 py-2 text-sm font-semibold text-white hover:bg-pink-700 transition disabled:opacity-70"
            >
              {isClearingSessions ? 'Clearing…' : 'Clear sessions + diagnostics'}
            </button>
            <p
              className={`min-h-5 text-xs ${
                clearSessionsFeedback
                  ? clearSessionsFeedback.type === 'success'
                    ? 'text-green-300'
                    : 'text-red-300'
                  : 'text-slate-500'
              }`}
            >
              {clearSessionsFeedback?.text ?? ' '}
            </p>
          </div>
        </div>

        <div className="flex h-full flex-col gap-2 rounded-xl border border-white/5 bg-slate-900/40 p-3">
          <div>
            <p className="text-sm font-semibold text-white">Clear Cherry Points Ledger</p>
            <p className="text-xs text-slate-400">
              Delete all CherryPointLedger entries for this user. Does not remove sessions.
            </p>
          </div>
          <div className="mt-auto space-y-1">
            <button
              type="button"
              onClick={() =>
                callEndpoint(
                  '/api/admin/clear-ledger',
                  setIsClearingLedger,
                  'Cleared points ledger',
                  setClearLedgerFeedback
                )
              }
              disabled={isClearingLedger}
              className="rounded-md bg-pink-600 px-3 py-2 text-sm font-semibold text-white hover:bg-pink-700 transition disabled:opacity-70"
            >
              {isClearingLedger ? 'Clearing…' : 'Clear points ledger'}
            </button>
            <p
              className={`min-h-5 text-xs ${
                clearLedgerFeedback
                  ? clearLedgerFeedback.type === 'success'
                    ? 'text-green-300'
                    : 'text-red-300'
                  : 'text-slate-500'
              }`}
            >
              {clearLedgerFeedback?.text ?? ' '}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
