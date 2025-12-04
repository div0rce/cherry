import type { JSX } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { MetricCard } from '@/components/ui/metric-card';
import { Panel } from '@/components/ui/panel';
import { EmptyState } from '@/components/ui/empty-state';
import { getCurrentUserIdOrRedirect } from '@/lib/auth';
import { getUserRealActivityForPeriod, type UnifiedActivityRow } from '@/lib/unified-activity';
import MonthPicker from './client';

type SearchParams = Promise<{ month?: string }>;

type StatementRollup = {
  totalDebitsCents: number;
  totalCreditsCents: number;
  netCents: number;
  pointsEarned: number;
  categoryBreakdown: { category: string; totalCents: number }[];
};

const hasText = (value?: string | null): value is string =>
  value !== undefined && value !== null && value !== '';

const isValidNumber = (value?: number | null): value is number =>
  value !== undefined && value !== null && !Number.isNaN(value);

function formatCurrency(value: number): string {
  return `$${value.toFixed(2)}`;
}

function summarize(rows: UnifiedActivityRow[]): StatementRollup {
  const cashEvents = rows.filter((row) => (row.cashDeltaCents ?? 0) !== 0);
  const pointsEvents = rows.filter((row) => (row.pointsDelta ?? row.pointsEarned ?? 0) !== 0);

  const totalDebitsCents = cashEvents
    .filter((row) => (row.cashDeltaCents ?? 0) < 0)
    .reduce((sum, row) => sum + Math.abs(row.cashDeltaCents ?? 0), 0);

  const totalCreditsCents = cashEvents
    .filter((row) => (row.cashDeltaCents ?? 0) > 0)
    .reduce((sum, row) => sum + (row.cashDeltaCents ?? 0), 0);

  const netCents = cashEvents.reduce((sum, row) => sum + (row.cashDeltaCents ?? 0), 0);

  const pointsEarned = pointsEvents
    .filter((row) => (row.pointsDelta ?? row.pointsEarned ?? 0) > 0)
    .reduce((sum, row) => sum + (row.pointsDelta ?? row.pointsEarned ?? 0), 0);

  const categoryTotals = new Map<string, number>();
  for (const row of cashEvents) {
    const delta = row.cashDeltaCents ?? 0;
    if (delta >= 0) continue;
    const key = row.rewardCategory ?? 'Uncategorized';
    categoryTotals.set(key, (categoryTotals.get(key) ?? 0) + Math.abs(delta));
  }

  return {
    totalDebitsCents: totalDebitsCents,
    totalCreditsCents,
    netCents,
    pointsEarned,
    categoryBreakdown: Array.from(categoryTotals.entries()).map(([category, totalCents]) => ({
      category,
      totalCents,
    })),
  };
}

function coerceDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function StatementTable({ rows }: { rows: UnifiedActivityRow[] }): JSX.Element {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="No activity this period"
        description="Connect accounts or run a simulation to populate this view."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-2xl border border-white/5 bg-slate-950/60 p-4 shadow-lg">
        <table className="min-w-full table-fixed text-sm text-slate-100">
          <thead className="text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="py-2 pr-4 text-left">When</th>
              <th className="py-2 pr-4 text-left">Merchant</th>
              <th className="py-2 pr-4 text-left">Card</th>
              <th className="py-2 pr-4 text-right">Amount</th>
              <th className="py-2 pr-4 text-right">Points</th>
              <th className="py-2 text-right">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((row) => {
              const occurredAt = coerceDate(row.occurredAt);
              return (
                <tr key={row.id}>
                  <td className="py-2 pr-4 text-xs text-slate-400">
                    {occurredAt.toLocaleString()}
                  </td>
                  <td className="py-2 pr-4">
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {row.merchantName ?? 'Unknown merchant'}
                      </span>
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
                    <AmountCell row={row} />
                  </td>
                  <td className="py-2 pr-4 text-right">
                    <PointsCell row={row} />
                  </td>
                  <td className="py-2 text-right">
                    <UserSourceBadge source={row.source} provider={row.providerSource} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-500">
        This is a consolidated analytic statement generated by Cherry from your connected accounts
        and simulations. For official statements, refer to your bank or card issuer.
      </p>
    </div>
  );
}

export default async function StatementsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<JSX.Element> {
  const params = await searchParams;
  const now = new Date();
  const defaultMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const selectedMonth =
    hasText(params.month) && /^\d{4}-\d{2}$/.test(params.month) ? params.month : defaultMonth;
  const [yearPart, monthPart] = selectedMonth.split('-');
  const year = Number(yearPart);
  const month = Number(monthPart);

  const userId = await getCurrentUserIdOrRedirect('/statements');
  const rows = await getUserRealActivityForPeriod(userId, { year, month });
  const stats = summarize(rows);

  return (
    <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <PageHeader
          label="Spend"
          title="Statements"
          description="Inspect per-statement and aggregate spend, engine tags, buckets, and card usage."
          actions={
            <div className="w-full md:w-auto">
              <MonthPicker initialMonth={selectedMonth} />
            </div>
          }
        />

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Total debits" value={formatCurrency(stats.totalDebitsCents / 100)} />
          <MetricCard label="Total credits" value={formatCurrency(stats.totalCreditsCents / 100)} />
          <MetricCard
            label="Net"
            value={formatCurrency(stats.netCents / 100)}
            tone={stats.netCents >= 0 ? 'positive' : 'negative'}
          />
          <MetricCard
            label="Points earned"
            value={`${stats.pointsEarned}`}
            helper="Posted in the period"
            tone="positive"
          />
        </section>

        <Panel
          title="Category breakdown"
          description="Real debits only; excludes simulations and pending items."
        >
          {stats.categoryBreakdown.length === 0 ? (
            <EmptyState
              title="No real spend this month"
              description="When real transaction debits land, Cherry will break them down by category here."
            />
          ) : (
            <ul className="mt-2 space-y-1 text-sm text-slate-100">
              {stats.categoryBreakdown.map((cat) => (
                <li key={cat.category} className="flex items-center justify-between">
                  <span>{cat.category}</span>
                  <span className="text-slate-300">{formatCurrency(cat.totalCents / 100)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Statement detail"
          description="Consolidated analytic statement generated by Cherry from connected accounts and simulations."
        >
          <StatementTable rows={rows} />
        </Panel>
      </div>
    </main>
  );
}

function AmountCell({ row }: { row: UnifiedActivityRow }): JSX.Element {
  const cashDelta = row.cashDeltaCents ?? 0;
  if (!isValidNumber(cashDelta) || cashDelta === 0) {
    return <span className="text-xs text-slate-500">—</span>;
  }

  const sign = cashDelta < 0 ? '-' : '+';
  const cls = cashDelta < 0 ? 'font-semibold text-rose-300' : 'font-semibold text-emerald-300';
  const abs = Math.abs(cashDelta) / 100;

  return (
    <span className={cls}>
      {sign}
      {abs.toFixed(2)} {row.currency}
    </span>
  );
}

function PointsCell({ row }: { row: UnifiedActivityRow }): JSX.Element {
  const pts = row.pointsDelta ?? row.pointsEarned ?? 0;
  if (!isValidNumber(pts) || pts === 0) {
    return <span className="text-xs text-slate-500">—</span>;
  }

  const sign = pts < 0 ? '-' : '+';
  const cls = pts < 0 ? 'text-xs text-rose-300' : 'text-xs text-emerald-300';

  return (
    <span className={cls}>
      {sign}
      {Math.abs(pts)}
    </span>
  );
}

function UserSourceBadge({
  source,
  provider,
}: {
  source: string;
  provider?: string | null | undefined;
}): JSX.Element {
  let label = 'Activity';
  switch (source) {
    case 'BANK_FEED':
    case 'STATEMENT_VIEW':
      label = 'Bank';
      break;
    default:
      label = 'Activity';
  }
  return (
    <div className="flex justify-end gap-1">
      <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-200">
        {label}
      </span>
      {process.env.NODE_ENV !== 'production' && hasText(provider) ? (
        <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] uppercase tracking-wide text-indigo-100">
          {provider}
        </span>
      ) : null}
    </div>
  );
}
