import type { JSX } from 'react';
import { notFound } from 'next/navigation';
import { getCurrentUserIdOrRedirect } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PageHeader } from '@/components/ui/page-header';
import { Panel } from '@/components/ui/panel';
import { EmptyState } from '@/components/ui/empty-state';
import { BANK_TX_DEFAULT_ORDER } from '@/lib/bank/fields';
import { ROUTES } from '@/lib/routes';
import { asError } from '@/lib/errors';

const hasText = (value?: string | null): value is string =>
  value !== undefined && value !== null && value !== '';

function formatAmount(cents: number | null | undefined, direction: string): string {
  if (cents == null) return '—';
  const abs = Math.abs(cents) / 100;
  const sign = direction === 'CREDIT' ? '+' : '-';
  return `${sign}$${abs.toFixed(2)}`;
}

export default async function DevBankPage(): Promise<JSX.Element> {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }
  const userId = await getCurrentUserIdOrRedirect(ROUTES.dev.bank);
  let rows: Awaited<ReturnType<typeof prisma.bankTransaction.findMany>> = [];
  let loadError: string | null = null;

  try {
    rows = await prisma.bankTransaction.findMany({
      where: { userId },
      orderBy: BANK_TX_DEFAULT_ORDER,
      take: 100,
    });
  } catch (err) {
    asError(err);
    console.error('DevBankPage Prisma error:', err);
    loadError =
      'Failed to load bank rows (likely Prisma schema/client mismatch). Rerun prisma generate and align queries.';
  }

  return (
    <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader
          label="Dev"
          title="Bank ingest debug"
          description="Recent BankTransaction rows for the current user. Dev-only; use npm run dev:ingest:moustafa-bank to re-run CSV ingest."
        />

        <Panel title="Recent bank rows" description="Sorted by posted date (desc); limit 100.">
          {hasText(loadError) ? (
            <div className="rounded-xl border border-red-500/40 bg-red-950/40 p-4 text-sm text-red-100">
              <p className="font-semibold text-red-200">Bank debug view failed to load.</p>
              <p className="mt-2">{loadError}</p>
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              title="No bank rows yet"
              description="Run npm run dev:ingest:moustafa-bank to load the SafeBalance dataset."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full table-fixed text-sm text-slate-100">
                <thead className="text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="py-2 pr-4 text-left">Posted</th>
                    <th className="py-2 pr-4 text-left">Description</th>
                    <th className="py-2 pr-4 text-right">Amount</th>
                    <th className="py-2 pr-4 text-right">Direction</th>
                    <th className="py-2 pr-4 text-right">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td className="py-2 pr-4 text-xs text-slate-400">
                        {row.postedAt?.toISOString().slice(0, 10) ?? '—'}
                      </td>
                      <td className="py-2 pr-4">
                        <div className="flex flex-col">
                          <span className="font-medium">{row.description ?? row.rawDescription ?? '—'}</span>
                          <span className="text-xs text-slate-500">{hasText(row.accountLast4) ? `•••• ${row.accountLast4}` : ''}</span>
                        </div>
                      </td>
                      <td className="py-2 pr-4 text-right">{formatAmount(row.amountMinor, row.direction)}</td>
                      <td className="py-2 pr-4 text-right">
                        <span className="text-xs text-slate-400">{row.direction}</span>
                      </td>
                      <td className="py-2 pr-4 text-right">
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-200">
                          {row.source}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </main>
  );
}
