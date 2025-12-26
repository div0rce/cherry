'use client';

import type { JSX } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { Card } from '../../../components/ui/card.js';
import { Button } from '../../../components/ui/Button.js';
import { Alert } from '../../../components/ui/alert.js';
import { asError } from '../../../lib/errors.js';

const hasText = (value?: string | null): value is string =>
  value !== undefined && value !== null && value !== '';

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
        const err = (await res.text()).trim();
        const message = hasText(err) ? err : 'Request failed';
        throw new Error(message);
      }
      setFeedback({ type: 'success', text: successText });
      router.refresh();
    } catch (error) {
      asError(error);
      setFeedback({
        type: 'error',
        text: error.message,
      });
    } finally {
      setLoading(false);
    }
  }

  async function ingestBankTransactions() {
    setIsPostingBank(true);
    setBankFeedback(null);
    try {
      const transactionsSchema = z
        .array(z.unknown())
        .or(
          z
            .object({ transactions: z.array(z.unknown()) })
            .strict()
            .transform((val) => val.transactions)
        );
      const parsedPayload: unknown = await new Response(bankPayload).json();
      const transactionsResult = transactionsSchema.safeParse(parsedPayload);
      if (!transactionsResult.success || transactionsResult.data.length === 0) {
        throw new Error('Provide a non-empty array of transactions.');
      }
      const transactions = transactionsResult.data;
      const res = await fetch('/api/dev/bank/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions }),
      });
      const data: unknown = await res.json();
      if (!res.ok) {
        throw new Error('Ingest failed');
      }
      const isObject = data !== null && typeof data === 'object';
      const ok = isObject && (data as { ok?: boolean }).ok === true;
      const ingested =
        isObject && typeof (data as { ingested?: number }).ingested === 'number'
          ? (data as { ingested?: number }).ingested ?? 0
          : 0;
      const error =
        isObject && typeof (data as { error?: string }).error === 'string'
          ? (data as { error?: string }).error
          : null;
      if (!ok) {
        throw new Error(error ?? 'Ingest failed');
      }
      setBankFeedback({
        type: 'success',
        text: `Ingested ${ingested} transaction(s)`,
      });
      router.refresh();
    } catch (error) {
      asError(error);
      setBankFeedback({
        type: 'error',
        text: error.message,
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
      asError(error);
      setBankFeedback({
        type: 'error',
        text: error.message,
      });
    } finally {
      setIsFetchingBank(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <Card tone="base" padding="md" className="flex h-full flex-col gap-2">
          <div>
            <p className="text-sm font-semibold text-[#f8fafc]">Seed demo data</p>
            <p className="text-xs text-[#a5b0d0]">
              Populate cards, buckets, sessions, and sample Cherry Points for this user.
            </p>
          </div>
          <div className="mt-auto space-y-2">
            <Button
              type="button"
              onClick={() =>
                callEndpoint('/api/seed-demo', setIsSeeding, 'Seeded demo data', setSeedFeedback)
              }
              disabled={isSeeding}
            >
              {isSeeding ? 'Seeding…' : 'Seed demo data'}
            </Button>
            {seedFeedback ? (
              <Alert
                variant={seedFeedback.type === 'success' ? 'success' : 'danger'}
                title={seedFeedback.text}
              />
            ) : null}
          </div>
        </Card>

        <Card tone="base" padding="md" className="flex h-full flex-col gap-2">
          <div>
            <p className="text-sm font-semibold text-[#f8fafc]">Seed cards &amp; buckets</p>
            <p className="text-xs text-[#a5b0d0]">
              Populate only cards and buckets for this user. Sessions and points remain untouched.
            </p>
          </div>
          <div className="mt-auto space-y-2">
            <Button
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
            >
              {isSeedingCardsBuckets ? 'Seeding…' : 'Seed cards & buckets'}
            </Button>
            {seedCardsBucketsFeedback ? (
              <Alert
                variant={seedCardsBucketsFeedback.type === 'success' ? 'success' : 'danger'}
                title={seedCardsBucketsFeedback.text}
              />
            ) : null}
          </div>
        </Card>

        <Card tone="base" padding="md" className="flex h-full flex-col gap-2">
          <div>
            <p className="text-sm font-semibold text-[#f8fafc]">Clear user data</p>
            <p className="text-xs text-[#a5b0d0]">
              Delete cards, buckets, and simulations for the current user.
            </p>
          </div>
          <div className="mt-auto space-y-2">
            <Button
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
              variant="destructive"
            >
              {isClearingUser ? 'Clearing…' : 'Clear user data'}
            </Button>
            {clearUserFeedback ? (
              <Alert
                variant={clearUserFeedback.type === 'success' ? 'success' : 'danger'}
                title={clearUserFeedback.text}
              />
            ) : null}
          </div>
        </Card>

        <Card tone="base" padding="md" className="flex h-full flex-col gap-2">
          <div>
            <p className="text-sm font-semibold text-[#f8fafc]">Clear Cherry Session Diagnostics</p>
            <p className="text-xs text-[#a5b0d0]">
              Delete all Cherry recommendation sessions and their points for this user. Sandbox only.
            </p>
          </div>
          <div className="mt-auto space-y-2">
            <Button
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
              variant="destructive"
            >
              {isClearingSessions ? 'Clearing…' : 'Clear sessions + diagnostics'}
            </Button>
            {clearSessionsFeedback ? (
              <Alert
                variant={clearSessionsFeedback.type === 'success' ? 'success' : 'danger'}
                title={clearSessionsFeedback.text}
              />
            ) : null}
          </div>
        </Card>

        <Card tone="base" padding="md" className="flex h-full flex-col gap-2">
          <div>
            <p className="text-sm font-semibold text-[#f8fafc]">Clear Cherry Points Ledger</p>
            <p className="text-xs text-[#a5b0d0]">
              Delete all CherryPointLedger entries for this user. Does not remove sessions.
            </p>
          </div>
          <div className="mt-auto space-y-2">
            <Button
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
              variant="destructive"
            >
              {isClearingLedger ? 'Clearing…' : 'Clear points ledger'}
            </Button>
            {clearLedgerFeedback ? (
              <Alert
                variant={clearLedgerFeedback.type === 'success' ? 'success' : 'danger'}
                title={clearLedgerFeedback.text}
              />
            ) : null}
          </div>
        </Card>

        <Card tone="base" padding="md" className="md:col-span-2 space-y-3">
          <div>
            <p className="text-sm font-semibold text-[#f8fafc]">Bank ingest debug</p>
            <p className="text-xs text-[#a5b0d0]">
              Paste provider-shaped transactions and upsert into BankTransaction. Use this to test
              history/statements without the bank simulator.
            </p>
          </div>
          <textarea
            value={bankPayload}
            onChange={(e) => setBankPayload(e.target.value)}
            className="min-h-[140px] rounded-lg border border-[rgba(27,38,69,0.6)] bg-[#05060f] px-3 py-2 text-xs text-[#eef2fb] focus-visible:outline-[2px_solid_#ff6b8a] focus-visible:outline-offset-2"
            spellCheck={false}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={() => ingestBankTransactions()} disabled={isPostingBank}>
              {isPostingBank ? 'Ingesting…' : 'Ingest transactions'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => fetchRecentBankTransactions()}
              disabled={isFetchingBank}
              size="sm"
            >
              {isFetchingBank ? 'Fetching…' : 'Dump last 5'}
            </Button>
            {bankFeedback ? (
              <Alert
                variant={bankFeedback.type === 'success' ? 'success' : 'danger'}
                title={bankFeedback.text}
              />
            ) : null}
          </div>
          {hasText(bankDump) && (
            <pre className="max-h-48 overflow-auto rounded-lg border border-[rgba(27,38,69,0.6)] bg-[#05060f] px-3 py-2 text-[11px] leading-relaxed text-[#dbe4ff]">
{bankDump}
            </pre>
          )}
        </Card>
      </div>
    </div>
  );
}
