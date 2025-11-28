'use client';

import type { JSX, ReactNode } from 'react';
import { useMemo, useState } from 'react';
import type { ActivitySource, UnifiedActivityRow } from '@/lib/unified-activity';

type TypeFilter = 'ALL' | 'REAL' | 'SIMULATED' | 'POINTS';

type CardOption = { id: string; nickname: string; network: string };

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
  cards,
}: {
  initialRows: UnifiedActivityRow[];
  cards: CardOption[];
}): JSX.Element {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [cardId, setCardId] = useState<string>('');
  const [merchantQuery, setMerchantQuery] = useState('');
  const [mccFilter, setMccFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const rows = useMemo(() => initialRows, [initialRows]);
  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        if (typeFilter === 'SIMULATED') {
          return (
            row.source === 'VINE_SIM' ||
            row.source === 'MANUAL_LOOKUP' ||
            row.source === 'OTHER_SIM'
          );
        }
        if (typeFilter === 'REAL') {
          return row.source === 'BANK_FEED' || row.source === 'STATEMENT_VIEW';
        }
        if (typeFilter === 'POINTS') {
          return row.pointsEarned != null && row.pointsEarned !== 0;
        }
        return true;
      })
        .filter((row) => {
          if (!cardId) return true;
          return row.cardId === cardId;
        })
        .filter((row) => {
          if (!merchantQuery.trim()) return true;
          return (row.merchantName ?? '').toLowerCase().includes(merchantQuery.toLowerCase());
        })
        .filter((row) => {
          if (!mccFilter.trim()) return true;
          const parsed = Number(mccFilter);
          if (Number.isNaN(parsed)) return true;
          return row.mcc === parsed;
        })
        .filter((row) => {
          if (!startDate && !endDate) return true;
          const occurred = coerceDate(row.occurredAt);
          if (startDate) {
            const start = new Date(startDate);
            if (occurred < start) return false;
          }
          if (endDate) {
            const end = new Date(endDate);
            // include end date full day
            end.setDate(end.getDate() + 1);
            if (occurred >= end) return false;
          }
          return true;
        }),
    [cardId, endDate, mccFilter, merchantQuery, rows, startDate, typeFilter],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-white/5 bg-slate-950/60 p-4 shadow-lg">
        <div className="flex flex-wrap items-center gap-3">
          <ModeButton mode="ALL" current={typeFilter} onChange={setTypeFilter}>
            All
          </ModeButton>
          <ModeButton mode="REAL" current={typeFilter} onChange={setTypeFilter}>
            Real
          </ModeButton>
          <ModeButton mode="SIMULATED" current={typeFilter} onChange={setTypeFilter}>
            Simulated
          </ModeButton>
          <ModeButton mode="POINTS" current={typeFilter} onChange={setTypeFilter}>
            Points
          </ModeButton>
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1 text-xs text-slate-300">
            Card
            <select
              className="rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white"
              value={cardId}
              onChange={(e) => setCardId(e.target.value)}
            >
              <option value="">All cards</option>
              {cards.map((card) => (
                <option key={card.id} value={card.id}>
                  {card.nickname} · {card.network}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs text-slate-300">
            Merchant
            <input
              value={merchantQuery}
              onChange={(e) => setMerchantQuery(e.target.value)}
              className="rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white"
              placeholder="Search merchant"
              type="text"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-slate-300">
            MCC
            <input
              value={mccFilter}
              onChange={(e) => setMccFilter(e.target.value)}
              className="rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white"
              placeholder="e.g. 5411"
              inputMode="numeric"
              type="number"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs text-slate-300">
              Start date
              <input
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white"
                type="date"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-300">
              End date
              <input
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white"
                type="date"
              />
            </label>
          </div>
        </div>
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
  mode: TypeFilter;
  current: TypeFilter;
  onChange: (mode: TypeFilter) => void;
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
