import type { JSX } from 'react';
import { getCurrentUserIdOrRedirect } from '@/lib/auth';
import { getUnifiedActivityForUser, type UnifiedActivityRow } from '@/lib/unified-activity';
import { PageHeader } from '@/components/ui/page-header';
import { MetricCard } from '@/components/ui/metric-card';
import { Panel } from '@/components/ui/panel';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorBanner } from '@/components/ErrorBanner';

const hasText = (value?: string | null): value is string =>
  value !== undefined && value !== null && value !== '';

const isValidNumber = (value?: number | null): value is number =>
  value !== undefined && value !== null && !Number.isNaN(value);

function formatCurrency(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function formatTimestamp(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export default async function SpendHistoryPage(): Promise<JSX.Element> {
  const userId = await getCurrentUserIdOrRedirect('/history');

  let rows: UnifiedActivityRow[] = [];
  let error: string | null = null;

  try {
    rows = await getUnifiedActivityForUser(userId, {
      limit: 200,
      sourceFilter: ['BANK_FEED', 'STATEMENT_VIEW'],
    });
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load spend history';
  }

  const debitRows = rows.filter((r) => (r.cashDeltaCents ?? 0) < 0);
  const totalDebitCents = debitRows.reduce((sum, row) => sum + Math.abs(row.cashDeltaCents ?? 0), 0);
  const avgTxnCents = rows.length > 0 ? totalDebitCents / rows.length : 0;

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 text-slate-100">
      <PageHeader
        label="Spend"
        title="Spend history"
        description="Explore chronological spend across statements and bank feeds, with card and bucket overlays where available."
      />

      <section className="grid gap-3 md:grid-cols-3">
        <MetricCard label="Transactions" value={rows.length} helper="Last 200" />
        <MetricCard label="Total debit" value={formatCurrency(totalDebitCents)} />
        <MetricCard label="Avg transaction" value={formatCurrency(avgTxnCents)} />
      </section>

      <Panel title="Spend timeline" description="Chronological spend with merchant, card, and amount.">
        {hasText(error) ? (
          <ErrorBanner message="Unable to load spend history." />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No spend history yet"
            description="Once you ingest transactions, they will appear here as a timeline."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed text-sm text-slate-100">
              <thead className="text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="py-2 pr-4 text-left">When</th>
                  <th className="py-2 pr-4 text-left">Merchant</th>
                  <th className="py-2 pr-4 text-left">Card</th>
                  <th className="py-2 pr-4 text-right">Amount</th>
                  <th className="py-2 pr-4 text-right">Direction</th>
                  <th className="py-2 text-right">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((row) => {
                  const amountCents = row.cashDeltaCents ?? Math.round((row.amount ?? 0) * 100);
                  const direction = amountCents < 0 ? 'Debit' : 'Credit';
                  return (
                    <tr key={row.id}>
                      <td className="py-2 pr-4 text-xs text-slate-400">
                        {formatTimestamp(new Date(row.occurredAt))}
                      </td>
                      <td className="py-2 pr-4">
                        <div className="flex flex-col">
                          <span className="font-medium">{row.merchantName ?? 'Unknown merchant'}</span>
                          <span className="text-xs text-slate-500">
                            {isValidNumber(row.mcc) ? `MCC ${row.mcc}` : 'MCC unknown'}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 pr-4 text-xs text-slate-400">
                        {hasText(row.cardName)
                          ? row.cardName
                          : hasText(row.cardBrand)
                            ? `${row.cardBrand}${hasText(row.cardLast4) ? ` •••• ${row.cardLast4}` : ''}`
                            : '—'}
                      </td>
                      <td className="py-2 pr-4 text-right">
                        <span className={amountCents < 0 ? 'text-rose-300 font-semibold' : 'text-emerald-300 font-semibold'}>
                          {amountCents < 0 ? '-' : '+'}
                          {formatCurrency(Math.abs(amountCents))}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-right">
                        <span className="text-xs text-slate-400">{direction}</span>
                      </td>
                  <td className="py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-200">
                        {(row.source ?? 'unknown').replace('_', ' ').toLowerCase()}
                      </span>
                      {process.env.NODE_ENV !== 'production' && hasText(row.providerSource) ? (
                        <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] uppercase tracking-wide text-indigo-100">
                          {row.providerSource}
                        </span>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
