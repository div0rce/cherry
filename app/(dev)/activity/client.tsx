'use client';

import type { JSX, ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { EmptyState } from '../../../components/ui/empty-state.js';
import type { ActivitySource, UnifiedActivityRow } from '../../../lib/unified-activity.js';

type TypeFilter = 'REAL' | 'SIMULATED';

type CardOption = { id: string; nickname: string; network: string };

const hasText = (value?: string | null): value is string =>
  value !== undefined && value !== null && value.trim() !== '';

const isValidNumber = (value?: number | null): value is number =>
  value !== undefined && value !== null && !Number.isNaN(value);

function coerceDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

export default function ActivityPageClient({
  initialRows,
  cards,
}: {
  initialRows: UnifiedActivityRow[];
  cards: CardOption[];
}): JSX.Element {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('REAL');
  const [cardId, setCardId] = useState<string>('');
  const [merchantQuery, setMerchantQuery] = useState('');
  const [mccFilter, setMccFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const rows = useMemo(() => initialRows, [initialRows]);
  const baseFiltered = useMemo(
    () =>
      rows
        .filter((row) => {
          if (cardId === '') return true;
          return row.cardId === cardId;
        })
        .filter((row) => {
          if (!hasText(merchantQuery)) return true;
          return (row.merchantName ?? '').toLowerCase().includes(merchantQuery.toLowerCase());
        })
        .filter((row) => {
          if (!hasText(mccFilter)) return true;
          const parsed = Number(mccFilter);
          if (Number.isNaN(parsed)) return true;
          return row.mcc === parsed;
        })
        .filter((row) => {
          const hasStart = hasText(startDate);
          const hasEnd = hasText(endDate);
          if (!hasStart && !hasEnd) return true;
          const occurred = coerceDate(row.occurredAt);
          if (hasStart) {
            const start = new Date(startDate);
            if (occurred < start) return false;
          }
          if (hasEnd) {
            const end = new Date(endDate);
            // include end date full day
            end.setDate(end.getDate() + 1);
            if (occurred >= end) return false;
          }
          return true;
        }),
    [cardId, endDate, mccFilter, merchantQuery, rows, startDate],
  );

  const counts = useMemo(
    () => ({
      real: baseFiltered.filter((row) => row.origin === 'REAL').length,
      simulated: baseFiltered.filter((row) => row.origin === 'SIMULATED').length,
    }),
    [baseFiltered],
  );

  const filteredRows = useMemo(
    () =>
      baseFiltered.filter((row) => {
        switch (typeFilter) {
          case 'REAL':
            return row.origin === 'REAL';
          case 'SIMULATED':
          default:
            return row.origin === 'SIMULATED';
        }
      }),
    [baseFiltered, typeFilter],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-white/5 bg-slate-950/60 p-4 shadow-lg">
      <div className="flex flex-wrap items-center gap-3">
          <ModeButton mode="REAL" current={typeFilter} onChange={setTypeFilter}>
            Real ({counts.real})
          </ModeButton>
          <ModeButton mode="SIMULATED" current={typeFilter} onChange={setTypeFilter}>
            Simulated ({counts.simulated})
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

      <ActivityTable rows={filteredRows} currentMode={typeFilter} />
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

function ActivityTable({
  rows,
  currentMode,
}: {
  rows: UnifiedActivityRow[];
  currentMode: TypeFilter;
}): JSX.Element {
  if (rows.length === 0) {
    if (currentMode === 'SIMULATED') {
      return (
        <EmptyState
          title="No simulated activity"
          description="Run a Vine simulation or Manual Lookup to populate simulated payments here."
        />
      );
    }
    if (currentMode === 'REAL') {
      return (
        <EmptyState
          title="No real transactions"
          description="Connect a bank feed to populate this view."
        />
      );
    }
    return (
      <EmptyState
        title="No activity yet"
        description="Connect accounts or run a simulation to populate this view."
      />
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
            const kindClass =
              row.kind === 'REAL_TRANSACTION'
                ? 'border-l-2 border-l-blue-500/60'
                : row.kind === 'SIMULATED_TRANSACTION'
                  ? 'border-l-2 border-l-pink-500/60'
                  : 'border-l-2 border-l-emerald-500/60';
            return (
              <tr key={row.id} className={kindClass}>
                <td className="py-2 pr-4 text-xs text-slate-400">{occurredAt.toLocaleString()}</td>
                <td className="py-2 pr-4">
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {row.merchantName ?? 'Unknown merchant'}
                    </span>
                    <span className="text-xs text-slate-500">
                      {isValidNumber(row.mcc) ? `MCC ${row.mcc}` : 'MCC unknown'}
                      {hasText(row.merchantLocation?.city) ? ` · ${row.merchantLocation.city}` : ''}
                      {hasText(row.merchantLocation?.region) ? `, ${row.merchantLocation.region}` : ''}
                    </span>
                    <span className="text-[10px] uppercase tracking-wide text-slate-500">
                      {row.kind === 'REAL_TRANSACTION'
                        ? 'Real transaction'
                        : row.kind === 'SIMULATED_TRANSACTION'
                          ? 'Simulated payment'
                          : 'Points event'}
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

function AmountCell({ row }: { row: UnifiedActivityRow }): JSX.Element {
  const cashDelta = row.cashDeltaCents ?? 0;
  if (!isValidNumber(cashDelta) || cashDelta === 0) {
    return <span className="text-xs text-slate-500">—</span>;
  }

  const sign = cashDelta < 0 ? '-' : '+';
  const cls = cashDelta < 0 ? 'text-rose-300' : 'text-emerald-300';
  const abs = Math.abs(cashDelta) / 100;

  return (
    <span className={`font-semibold ${cls}`}>
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
  const cls = pts < 0 ? 'text-rose-300' : 'text-emerald-300';

  return (
    <span className={`text-xs ${cls}`}>
      {sign}
      {Math.abs(pts)}
    </span>
  );
}
