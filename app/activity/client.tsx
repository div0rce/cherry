'use client';

import type { JSX, ReactNode } from 'react';
import { useMemo, useState } from 'react';
import type { ActivitySource, UnifiedActivityRow } from '@/lib/unified-activity';

type Mode = 'ALL' | 'SIMULATED' | 'BANK';

function coerceDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function formatAmount(amount: number, currency: string, direction: 'DEBIT' | 'CREDIT'): string {
  const value = amount.toFixed(2);
  const sign = direction === 'CREDIT' ? '+' : '-';
  return `${sign}${value} ${currency}`;
}

export default function ActivityPageClient({
  initialRows,
}: {
  initialRows: UnifiedActivityRow[];
}): JSX.Element {
  const [mode, setMode] = useState<Mode>('ALL');

  const rows = useMemo(() => initialRows, [initialRows]);
  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        if (mode === 'ALL') return true;
        if (mode === 'SIMULATED') {
          return (
            row.source === 'VINE_SIM' ||
            row.source === 'MANUAL_LOOKUP' ||
            row.source === 'OTHER_SIM'
          );
        }
        if (mode === 'BANK') {
          return row.source === 'BANK_FEED' || row.source === 'STATEMENT_VIEW';
        }
        return true;
      }),
    [mode, rows],
  );

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-full border border-white/10 bg-slate-950/60 p-1 text-xs">
        <ModeButton mode="ALL" current={mode} onChange={setMode}>
          All activity
        </ModeButton>
        <ModeButton mode="SIMULATED" current={mode} onChange={setMode}>
          Simulated &amp; rewards
        </ModeButton>
        <ModeButton mode="BANK" current={mode} onChange={setMode}>
          Bank &amp; statements
        </ModeButton>
      </div>

      <ActivityTable rows={filteredRows} />
    </div>
  );
}

function ModeButton({
  mode,
  current,
  onChange,
  children,
}: {
  mode: Mode;
  current: Mode;
  onChange: (mode: Mode) => void;
  children: ReactNode;
}): JSX.Element {
  const active = current === mode;
  return (
    <button
      type="button"
      onClick={() => onChange(mode)}
      className={[
        'rounded-full px-3 py-1 transition',
        active ? 'bg-pink-500 text-white shadow' : 'text-slate-300 hover:text-white',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function ActivityTable({ rows }: { rows: UnifiedActivityRow[] }): JSX.Element {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-white/5 bg-white/5 p-4 shadow-lg">
        <p className="text-sm text-slate-300">
          No activity yet. Connect accounts or run a simulation to populate this view.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-4 shadow-lg">
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
                <td className="py-2 pr-4 text-xs text-slate-400">{occurredAt.toLocaleString()}</td>
                <td className="py-2 pr-4">
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {row.merchantName ?? 'Unknown merchant'}
                    </span>
                    <span className="text-xs text-slate-500">
                      {row.mcc ? `MCC ${row.mcc}` : 'MCC unknown'}
                      {row.merchantLocation?.city ? ` · ${row.merchantLocation.city}` : ''}
                      {row.merchantLocation?.region ? `, ${row.merchantLocation.region}` : ''}
                    </span>
                  </div>
                </td>
                <td className="py-2 pr-4 text-xs text-slate-400">
                  {row.cardName ??
                    (row.cardBrand
                      ? `${row.cardBrand}${row.cardLast4 ? ` •••• ${row.cardLast4}` : ''}`
                      : '—')}
                </td>
                <td className="py-2 pr-4 text-right">
                  <span
                    className={
                      row.direction === 'DEBIT'
                        ? 'font-semibold text-slate-100'
                        : 'font-semibold text-emerald-300'
                    }
                  >
                    {formatAmount(row.amount, row.currency, row.direction)}
                  </span>
                </td>
                <td className="py-2 pr-4 text-right text-xs text-emerald-300">
                  {row.pointsEarned != null ? `+${row.pointsEarned}` : '—'}
                </td>
                <td className="py-2 text-right">
                  <SourceBadge source={row.source} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <ActivityDisclaimer />
    </div>
  );
}

function SourceBadge({ source }: { source: ActivitySource }): JSX.Element {
  const base =
    'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide';
  switch (source) {
    case 'BANK_FEED':
      return <span className={`${base} bg-blue-500/10 text-blue-200`}>Bank</span>;
    case 'STATEMENT_VIEW':
      return <span className={`${base} bg-indigo-500/10 text-indigo-200`}>Statement</span>;
    case 'VINE_SIM':
      return <span className={`${base} bg-pink-500/10 text-pink-200`}>Vine Sim</span>;
    case 'MANUAL_LOOKUP':
      return <span className={`${base} bg-teal-500/10 text-teal-200`}>Manual Lookup</span>;
    case 'OTHER_SIM':
      return <span className={`${base} bg-slate-500/10 text-slate-200`}>Other</span>;
    default: {
      const _exhaustive: never = source;
      return <span className={`${base} bg-slate-500/10 text-slate-200`}>{_exhaustive}</span>;
    }
  }
}

function ActivityDisclaimer(): JSX.Element {
  return (
    <p className="mt-3 text-xs text-slate-500">
      This is an analytic consolidated view generated by Cherry from your connected accounts and
      simulations. For official statements or disputes, refer to your bank or card issuer.
    </p>
  );
}
