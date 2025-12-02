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
  const [seedCardsBucketsFeedback, setSeedCardsBucketsFeedback] = useState<
    { type: 'success' | 'error'; text: string } | null
  >(null);
  const [isSeedingCardsBuckets, setIsSeedingCardsBuckets] = useState(false);
  const [clearUserFeedback, setClearUserFeedback] = useState<
    { type: 'success' | 'error'; text: string } | null
  >(null);
  const [clearSessionsFeedback, setClearSessionsFeedback] = useState<
    { type: 'success' | 'error'; text: string } | null
  >(null);
  const [clearLedgerFeedback, setClearLedgerFeedback] = useState<
    { type: 'success' | 'error'; text: string } | null
  >(null);
  const [bankPayload, setBankPayload] = useState(
    JSON.stringify(
      [
        {
          externalId: 'demo-tx-1',
          accountExternalId: 'demo-account-1',
          userExternalId: 'lab+single-user@cherry.dev',
          amountCents: 1875,
          currency: 'USD',
          occurredAt: new Date().toISOString(),
          description: 'Chipotle',
          merchantName: 'Chipotle',
          mcc: '5812',
        },
      ],
      null,
      2
    )
  );
  const [bankFeedback, setBankFeedback] = useState<
    { type: 'success' | 'error'; text: string } | null
  >(null);
  const [bankDump, setBankDump] = useState<string>('');
  const [isPostingBank, setIsPostingBank] = useState(false);
  const [isFetchingBank, setIsFetchingBank] = useState(false);

  useEffect(() => {
    if (!seedFeedback) return;
    const id = setTimeout(() => setSeedFeedback(null), 3000);
    return () => clearTimeout(id);
  }, [seedFeedback]);

  useEffect(() => {
    if (!seedCardsBucketsFeedback) return;
    const id = setTimeout(() => setSeedCardsBucketsFeedback(null), 3000);
    return () => clearTimeout(id);
  }, [seedCardsBucketsFeedback]);

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

  useEffect(() => {
    if (!bankFeedback) return;
    const id = setTimeout(() => setBankFeedback(null), 4000);
    return () => clearTimeout(id);
  }, [bankFeedback]);

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

  async function ingestBankTransactions() {
    setIsPostingBank(true);
    setBankFeedback(null);
    try {
      const parsed: unknown = JSON.parse(bankPayload);
      const transactions =
        Array.isArray(parsed)
          ? parsed
          : parsed && typeof parsed === 'object' && Array.isArray((parsed as { transactions?: unknown }).transactions)
            ? (parsed as { transactions: unknown[] }).transactions
            : null;
      if (!transactions || transactions.length === 0) {
        throw new Error('Provide a non-empty array of transactions.');
      }
      const res = await fetch('/api/dev/bank/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions }),
      });
      const data: unknown = await res.json();
      if (!res.ok) {
        throw new Error('Ingest failed');
      }
      const ok = data && typeof data === 'object' ? (data as { ok?: boolean }).ok === true : false;
      const ingested =
        data && typeof data === 'object' ? (data as { ingested?: number }).ingested ?? 0 : 0;
      const error =
        data && typeof data === 'object' ? (data as { error?: string }).error ?? null : null;
      if (!ok) {
        throw new Error(error ?? 'Ingest failed');
      }
      setBankFeedback({
        type: 'success',
        text: `Ingested ${ingested} transaction(s)`,
      });
      router.refresh();
    } catch (error) {
      setBankFeedback({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to ingest',
      });
    } finally {
      setIsPostingBank(false);
    }
  }

  async function fetchRecentBankTransactions() {
    setIsFetchingBank(true);
    setBankFeedback(null);
    try {
      const res = await fetch('/api/dev/bank/ingest?limit=5');
      const data = (await res.json()) as { transactions?: unknown[]; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? 'Failed to fetch');
      }
      setBankDump(JSON.stringify(data.transactions ?? [], null, 2));
    } catch (error) {
      setBankFeedback({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to fetch',
      });
    } finally {
      setIsFetchingBank(false);
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
            <p className="text-sm font-semibold text-white">Seed cards &amp; buckets</p>
            <p className="text-xs text-slate-400">
              Populate only cards and buckets for this user. Sessions and points remain untouched.
            </p>
          </div>
          <div className="mt-auto space-y-1">
            <button
              type="button"
              onClick={() =>
                callEndpoint(
                  '/api/seed-demo/cards-buckets',
                  setIsSeedingCardsBuckets,
                  'Seeded cards & buckets',
                  setSeedCardsBucketsFeedback
                )
              }
              disabled={isSeedingCardsBuckets}
              className="rounded-md bg-pink-600 px-3 py-2 text-sm font-semibold text-white hover:bg-pink-700 transition disabled:opacity-70"
            >
              {isSeedingCardsBuckets ? 'Seeding…' : 'Seed cards & buckets'}
            </button>
            <p
              className={`min-h-5 text-xs ${
                seedCardsBucketsFeedback
                  ? seedCardsBucketsFeedback.type === 'success'
                    ? 'text-green-300'
                    : 'text-red-300'
                  : 'text-slate-500'
              }`}
            >
              {seedCardsBucketsFeedback?.text ?? ' '}
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

        <div className="flex h-full flex-col gap-2 rounded-xl border border-white/5 bg-slate-900/40 p-3 md:col-span-2">
          <div>
            <p className="text-sm font-semibold text-white">Bank ingest debug</p>
            <p className="text-xs text-slate-400">
              Paste provider-shaped transactions and upsert into BankTransaction. Use this to test
              history/statements without the bank simulator.
            </p>
          </div>
          <textarea
            value={bankPayload}
            onChange={(e) => setBankPayload(e.target.value)}
            className="min-h-[140px] rounded-md border border-white/10 bg-black/30 px-3 py-2 text-xs text-slate-100 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-300"
            spellCheck={false}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => ingestBankTransactions()}
              disabled={isPostingBank}
              className="rounded-md bg-pink-600 px-3 py-2 text-xs font-semibold text-white hover:bg-pink-700 transition disabled:opacity-70"
            >
              {isPostingBank ? 'Ingesting…' : 'Ingest transactions'}
            </button>
            <button
              type="button"
              onClick={() => fetchRecentBankTransactions()}
              disabled={isFetchingBank}
              className="rounded-md border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-slate-100 hover:border-pink-400/40 hover:text-white disabled:opacity-70"
            >
              {isFetchingBank ? 'Fetching…' : 'Dump last 5'}
            </button>
            <p
              className={`min-h-5 text-xs ${
                bankFeedback
                  ? bankFeedback.type === 'success'
                    ? 'text-green-300'
                    : 'text-red-300'
                  : 'text-slate-500'
              }`}
            >
              {bankFeedback?.text ?? ' '}
            </p>
          </div>
          {bankDump && (
            <pre className="max-h-48 overflow-auto rounded-md border border-white/10 bg-black/30 px-3 py-2 text-[11px] leading-relaxed text-slate-200">
{bankDump}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
