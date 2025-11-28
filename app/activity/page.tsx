import type { JSX } from 'react';
import { getCurrentUserIdOrRedirect } from '@/lib/auth';
import { getUserActivityLedger } from '@/lib/unified-activity';

function formatAmount(amount: number, currency: string, direction: 'DEBIT' | 'CREDIT'): string {
  const value = amount.toFixed(2);
  const sign = direction === 'CREDIT' ? '+' : '-';
  return `${sign}${value} ${currency}`;
}

export default async function ActivityPage(): Promise<JSX.Element> {
  const userId = await getCurrentUserIdOrRedirect('/activity');
  const rows = await getUserActivityLedger(userId);

  const hasRows = rows.length > 0;

  return (
    <main className="flex-1 overflow-y-auto px-6 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-label text-pink-200">Activity</p>
          <h1 className="text-3xl font-semibold text-white">Activity</h1>
          <p className="text-slate-300">
            Real purchases will appear here once Cherry is connected to your cards. Simulated and dev
            activity live in Dev Tools.
          </p>
        </header>

        {hasRows ? (
          <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-4 shadow-lg">
            <table className="min-w-full table-fixed text-sm text-slate-100">
              <thead className="text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="py-2 pr-4 text-left">When</th>
                  <th className="py-2 pr-4 text-left">Merchant</th>
                  <th className="py-2 pr-4 text-left">Card</th>
                  <th className="py-2 pr-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="py-2 pr-4 text-xs text-slate-400">
                      {row.occurredAt.toLocaleString()}
                    </td>
                    <td className="py-2 pr-4">
                      <div className="flex flex-col">
                        <span className="font-medium">{row.merchantName ?? 'Unknown merchant'}</span>
                        <span className="text-xs text-slate-500">
                          {row.mcc ? `MCC ${row.mcc}` : 'MCC unknown'}
                          {row.merchantLocation?.city ? ` · ${row.merchantLocation.city}` : ''}
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/5 bg-white/5 p-4 shadow-lg">
            <p className="text-sm text-slate-300">
              No real transactions yet. You’re still in simulation mode. Use Vine or Manual tools in
              Dev Tools to experiment; those events won’t appear here until Cherry is hooked up to real
              transactions.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
