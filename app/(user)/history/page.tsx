import type { JSX } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Panel } from '@/components/ui/panel';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorBanner } from '@/components/ErrorBanner';
import { getCurrentUserIdOrRedirect } from '@/lib/auth';
import { getUnifiedActivityForUser, type UnifiedActivityRow } from '@/lib/unified-activity';
import { cherryTextClasses } from '@/lib/ui/theme';
import { cn } from '@/lib/ui/cn';

function formatDate(date: Date): string {
  const iso = date.toISOString();
  const datePart = iso.split('T')[0] ?? iso;
  return datePart;
}

function formatAmount(row: UnifiedActivityRow): string {
  const cents =
    typeof row.cashDeltaCents === 'number'
      ? row.cashDeltaCents
      : Math.round(row.amount * 100) * (row.direction === 'CREDIT' ? 1 : -1);
  const dollars = cents / 100;
  const absolute = Math.abs(dollars).toFixed(2);
  const sign = dollars < 0 ? '-' : '';
  return `${sign}$${absolute}`;
}

export default async function UserHistoryPage(): Promise<JSX.Element> {
  const userId = await getCurrentUserIdOrRedirect('/history');

  let activity: UnifiedActivityRow[] = [];
  let error: string | null = null;

  try {
    activity = await getUnifiedActivityForUser(userId, {
      limit: 100,
      sourceFilter: ['BANK_FEED', 'STATEMENT_VIEW'],
    });
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load history';
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 space-y-6">
      <PageHeader
        title="Spend history"
        description="Recent transactions recorded by your connected accounts. A clean overview of your spending activity."
      />

      <Panel
        tone="muted"
        title="Recent activity"
        description="Pulled from your linked statements and bank transactions."
      >
        {error !== null ? (
          <ErrorBanner message={error} />
        ) : activity.length === 0 ? (
          <EmptyState
            title="No activity yet"
            description="Link statements or ingest bank data to see your spend timeline."
          />
        ) : (
          <div className="space-y-3">
            {activity.map((row) => (
              <Card
                key={`${row.source}-${row.id}`}
                tone="base"
                padding="md"
                className="border border-ink-700/60"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-cloud-200">{formatDate(row.occurredAt)}</p>
                    <p className="text-lg font-semibold text-cloud-50">
                      {row.merchantName ?? 'Unknown merchant'}
                    </p>
                    <p className={cn('text-sm', cherryTextClasses.subtle)}>
                      {row.cardName ?? row.cardBrand ?? 'Card not recorded'}{' '}
                      {row.cardLast4 !== null && row.cardLast4 !== undefined && row.cardLast4 !== ''
                        ? `••${row.cardLast4}`
                        : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-cloud-50">{formatAmount(row)}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
