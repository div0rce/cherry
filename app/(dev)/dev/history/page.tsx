import type { JSX } from 'react';
import { getCurrentUserIdOrRedirect } from '../../../../lib/auth.js';
import { getUnifiedActivityForUser, type UnifiedActivityRow } from '../../../../lib/unified-activity.js';
import { ROUTES } from '../../../../lib/routes.js';
import { PageHeader } from '../../../../components/ui/page-header.js';
import { MetricCard } from '../../../../components/ui/metric-card.js';
import { Panel } from '../../../../components/ui/panel.js';
import { EmptyState } from '../../../../components/ui/empty-state.js';
import { Alert } from '../../../../components/ui/alert.js';
import { getServerConfig } from '../../../../lib/config/store.js';
import { asError } from '../../../../lib/errors.js';

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
  const userId = await getCurrentUserIdOrRedirect(ROUTES.dev.history);
  const serverConfig = getServerConfig();

  let rows: UnifiedActivityRow[] = [];
  let error: string | null = null;

  try {
    rows = await getUnifiedActivityForUser(userId, {
      limit: 200,
      sourceFilter: ['BANK_FEED', 'STATEMENT_VIEW'],
    });
  } catch (err) {
    asError(err);
    error = err.message;
  }

  const debitRows = rows.filter((r) => (r.cashDeltaCents ?? 0) < 0);
  const totalDebitCents = debitRows.reduce((sum, row) => sum + Math.abs(row.cashDeltaCents ?? 0), 0);
  const avgTxnCents = rows.length > 0 ? totalDebitCents / rows.length : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader
        label="Money (Real)"
        badge="Dev / Lab tool"
        title="Spend history"
        description="Chronological spend across statements and bank feeds. Dev-only; advisory/read-only with card and bucket overlays where available."
      />

      <section className="grid gap-3 md:grid-cols-3">
        <MetricCard label="Transactions" value={rows.length} helper="Last 200" />
        <MetricCard label="Total debit" value={formatCurrency(totalDebitCents)} />
        <MetricCard label="Avg transaction" value={formatCurrency(avgTxnCents)} />
      </section>

      <Panel
        tone="muted"
        title="Spend timeline"
        description="Chronological spend with merchant, card, and amount."
      >
        {hasText(error) ? (
          <Alert variant="danger" title="Unable to load spend history." description={error} />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No spend history yet"
            description="Once you ingest transactions, they will appear here as a timeline."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed text-sm text-[#f8fafc]">
              <thead className="text-xs uppercase tracking-[0.2em] text-[#c3cce5]">
                <tr>
                  <th className="py-2 pr-4 text-left">When</th>
                  <th className="py-2 pr-4 text-left">Merchant</th>
                  <th className="py-2 pr-4 text-left">Card</th>
                  <th className="py-2 pr-4 text-right">Amount</th>
                  <th className="py-2 pr-4 text-right">Direction</th>
                  <th className="py-2 text-right">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(17,26,47,0.6)]">
                {rows.map((row) => {
                  const amountCents = row.cashDeltaCents ?? Math.round((row.amount ?? 0) * 100);
                  const direction = amountCents < 0 ? 'Debit' : 'Credit';
                  const amountClass =
                    amountCents < 0 ? 'text-rose-200 font-semibold' : 'text-[#bff0db] font-semibold';
                  return (
                    <tr key={row.id}>
                      <td className="py-2 pr-4 text-xs text-[#a5b0d0]">
                        {formatTimestamp(new Date(row.occurredAt))}
                      </td>
                      <td className="py-2 pr-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-[#f8fafc]">
                            {row.merchantName ?? 'Unknown merchant'}
                          </span>
                          <span className="text-xs text-[#a5b0d0]">
                            {isValidNumber(row.mcc) ? `MCC ${row.mcc}` : 'MCC unknown'}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 pr-4 text-xs text-[#c3cce5]">
                        {hasText(row.cardName)
                          ? row.cardName
                          : hasText(row.cardBrand)
                            ? `${row.cardBrand}${hasText(row.cardLast4) ? ` •••• ${row.cardLast4}` : ''}`
                            : '—'}
                      </td>
                      <td className="py-2 pr-4 text-right">
                        <span className={amountClass}>
                          {amountCents < 0 ? '-' : '+'}
                          {formatCurrency(Math.abs(amountCents))}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-right">
                        <span className="text-xs text-[#a5b0d0]">{direction}</span>
                      </td>
                      <td className="py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <span className="rounded-full border border-[rgba(27,38,69,0.6)] bg-[rgba(17,26,47,0.7)] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[#dbe4ff]">
                            {(row.source ?? 'unknown').replace('_', ' ').toLowerCase()}
                          </span>
                          {serverConfig.enableDevTools && hasText(row.providerSource) ? (
                            <span className="rounded-full border border-[rgba(27,38,69,0.6)] bg-[rgba(255,77,109,0.15)] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[#ffe6ee]">
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
