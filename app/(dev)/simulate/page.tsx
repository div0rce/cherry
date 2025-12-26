import type { JSX } from 'react';
import { redirect } from 'next/navigation';
import { RunSimulationForm, DeleteSimulationButton } from './client.js';
import { getCurrentUserId } from '../../../lib/auth.js';
import { ROUTES } from '../../../lib/routes.js';
import type { SimulationHistoryItem } from '../../../components/simulations/simulation-history-list.js';
import { SimulationHistoryList } from '../../../components/simulations/simulation-history-list.js';
import { hasText } from '../../../lib/text.js';
import { PageHeader } from '../../../components/ui/page-header.js';
import { Panel } from '../../../components/ui/panel.js';
import { Card } from '../../../components/ui/card.js';
import { Button, ButtonLink } from '../../../components/ui/Button.js';
import { asError } from '../../../lib/errors.js';

type Simulation = {
  id: string;
  amount: number;
  currency: string;
  resolvedCategory: string;
  mccCode: number | null;
  merchantName: string | null;
  status: string;
  reason: string | null;
  rewardRuleCategory: string | null;
  multiplier: number | null;
  cashbackPercent: number | null;
  rewardsEarnedCents: number | null;
  rewardsEarnedPoints: number | null;
  rewardMultiplier: number | null;
  rewardsEarned: number | null;
  bucketBeforeCents: number | null;
  bucketAfterCents: number | null;
  bucketLimitCents: number | null;
  bucketName: string | null;
  bucketPeriod: string | null;
  chosenCardName: string | null;
  strictDecline: boolean;
  createdAt: string;
  chosenCard?: {
    id: string;
    nickname: string;
    issuer: string;
    network: string;
  } | null;
  bucket?: {
    id: string;
    name: string;
    category: string;
    currentAmount: number;
    budgetAmount: number;
    strictMode: boolean;
  } | null;
};

function formatCents(cents: number | null | undefined) {
  if (cents == null) return '—';
  return `$${(cents / 100).toFixed(2)}`;
}

function formatRewards(sim: Simulation) {
  if (sim.rewardsEarnedCents != null) return `${formatCents(sim.rewardsEarnedCents)} cashback`;
  if (sim.rewardsEarnedPoints != null) return `${sim.rewardsEarnedPoints} pts`;
  if (sim.rewardsEarned != null) return `${sim.rewardsEarned} pts`;
  if (sim.rewardMultiplier != null) return `${sim.rewardMultiplier}x multiplier`;
  return '—';
}

function toHistoryItems(simulations: Simulation[]): SimulationHistoryItem[] {
  return simulations.map((sim) => {
    const chosenCard = sim.chosenCard;
    const hasChosenCard = chosenCard !== null && chosenCard !== undefined;
    const cardDisplayName = hasChosenCard
      ? `${chosenCard.nickname} (${chosenCard.issuer} · ${chosenCard.network})`
      : hasText(sim.chosenCardName)
        ? sim.chosenCardName
        : null;
    const bucketLabel = sim.bucketName ?? sim.bucket?.name ?? null;
    const bucketCategory = sim.bucket?.category ?? sim.resolvedCategory;
    const bucketLimit = sim.bucketLimitCents ?? sim.bucket?.budgetAmount ?? null;
    const bucketRemainingBefore = sim.bucketBeforeCents;
    const bucketRemainingAfter = sim.bucketAfterCents ?? null;
    const bucketStrictFlag =
      typeof sim.bucket?.strictMode === 'boolean'
        ? sim.bucket.strictMode
        : sim.strictDecline
          ? true
          : undefined;
    const bucketDetails = [
      bucketLimit != null ? `Limit ${formatCents(bucketLimit)}` : null,
      bucketRemainingBefore != null ? `Before ${formatCents(bucketRemainingBefore)}` : null,
      bucketRemainingAfter != null ? `After ${formatCents(bucketRemainingAfter)}` : null,
    ].filter((detail): detail is string => detail !== null);
    const bucketDisciplineLabel =
      bucketStrictFlag == null ? null : bucketStrictFlag ? '(strict)' : '(soft)';
    const bucketMeta = [
      hasText(bucketCategory) ? `Category ${bucketCategory}` : null,
      hasText(bucketLabel) ? bucketLabel : null,
    ].filter((item): item is string => item !== null);
    const reasonLabel = hasText(sim.reason) ? sim.reason : '—';

    return {
      id: sim.id,
      createdAt: sim.createdAt,
      title: `${formatCents(sim.amount)} · ${sim.resolvedCategory}${
        sim.mccCode !== null && sim.mccCode !== undefined ? ` · MCC ${sim.mccCode}` : ''
      }`,
      subtitle: hasText(sim.merchantName) ? sim.merchantName : 'Merchant N/A',
      status: sim.status,
      statusTone: sim.status === 'APPROVED' ? 'positive' : 'negative',
      meta: bucketMeta,
      body: (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-slate-900/70 p-3 space-y-1">
            <p className="text-[11px] uppercase tracking-[0.12em] text-slate-400">Card</p>
            {hasText(cardDisplayName) ? (
              <p className="text-sm font-semibold text-white">{cardDisplayName}</p>
            ) : (
              <p className="text-sm text-slate-500">None (declined/no card)</p>
            )}
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-900/70 p-3 space-y-1">
            <p className="text-[11px] uppercase tracking-[0.12em] text-slate-400">Bucket</p>
            {hasText(bucketLabel) ? (
              <div className="text-sm text-slate-200">
                <p className="font-semibold text-white">
                  {bucketLabel}
                  {hasText(bucketCategory) ? ` · ${bucketCategory}` : ''}
                </p>
                <p className="text-slate-400">
                  {bucketDetails.length > 0 ? bucketDetails.join(' · ') : 'No tracked balances'}
                  {bucketDisciplineLabel !== null ? ` ${bucketDisciplineLabel}` : ''}
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No bucket matched</p>
            )}
          </div>
        </div>
      ),
      footer: (
        <>
          <span>Reason: {reasonLabel}</span>
          <span>Rewards: {formatRewards(sim)}</span>
        </>
      ),
      action: <DeleteSimulationButton simulationId={sim.id} />,
    };
  });
}

type SimulationResponse = {
  data: Simulation[];
  total: number;
  page: number;
  pageSize: number;
};

async function fetchSimulations(query: {
  status?: string;
  category?: string;
  page?: number;
  pageSize?: number;
}): Promise<SimulationResponse> {
  const params = new URLSearchParams();
  if (hasText(query.status)) params.set('status', query.status);
  if (hasText(query.category)) params.set('category', query.category);
  if (typeof query.page === 'number' && Number.isFinite(query.page)) {
    params.set('page', String(query.page));
  }
  if (typeof query.pageSize === 'number' && Number.isFinite(query.pageSize)) {
    params.set('pageSize', String(query.pageSize));
  }

  const queryString = params.toString();
  const url = queryString.length > 0 ? `/api/simulations?${queryString}` : '/api/simulations';

  const res = await fetch(url, { cache: 'no-store' });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    const message = await res.text();
    throw new Error(hasText(message) ? message : 'Failed to load simulations');
  }

  const data = (await res.json()) as SimulationResponse;
  return data;
}

export default async function SimulatePage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<JSX.Element> {
  const resolvedParams = (await searchParams) ?? {};
  try {
    await getCurrentUserId();
  } catch {
    redirect(`/signin?callbackUrl=${encodeURIComponent('/simulate')}`);
  }

  const statusParam =
    typeof resolvedParams['status'] === 'string' ? resolvedParams['status'] : '';
  const categoryParam =
    typeof resolvedParams['category'] === 'string' ? resolvedParams['category'] : '';
  const resolvedStatus = hasText(statusParam) ? statusParam : 'ALL';
  const resolvedCategory = hasText(categoryParam) ? categoryParam : '';
  const pageParam = Number.parseInt(
    typeof resolvedParams['page'] === 'string' ? resolvedParams['page'] : '1',
    10
  );
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  let response: SimulationResponse | null = null;
  let error: string | null = null;

  try {
    const query = {
      page,
      pageSize: 10,
      ...(hasText(statusParam) ? { status: statusParam } : {}),
      ...(hasText(categoryParam) ? { category: categoryParam } : {}),
    };
    response = await fetchSimulations(query);
  } catch (caught) {
    asError(caught);
    if (caught.message === 'UNAUTHORIZED') {
      redirect(`/signin?callbackUrl=${encodeURIComponent('/simulate')}`);
    }
    error = caught.message;
  }

  const simulations = response?.data ?? [];
  const total = response?.total ?? 0;
  const pageSize = response?.pageSize ?? 10;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const historyItems = toHistoryItems(simulations);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader
        label="Engine"
        badge="Dev / Lab Tool"
        title="Simulate spend"
        description="Post simulated transactions and see the engine decision history (card, bucket, rewards). Dev-only advisory surface."
        actions={
          <ButtonLink href={ROUTES.dev.cards} variant="secondary" size="sm">
            Manage cards
          </ButtonLink>
        }
      />

      <div className="grid gap-6 md:grid-cols-[2fr,1fr]">
        <Panel
          tone="muted"
          title="Simulation history"
          description="Recent simulated swipes with bucket and card decisions."
          actions={
            <SimulationFilters status={resolvedStatus} category={resolvedCategory} page={page} />
          }
          footer={
            <SimulationPagination
              total={total}
              page={page}
              pageSize={pageSize}
              status={resolvedStatus}
              category={resolvedCategory}
              totalPages={totalPages}
            />
          }
        >
          <SimulationHistoryList
            items={historyItems}
            title="Simulation history"
            subtitle="Recent simulated swipes with bucket and card decisions."
            emptyState={{
              title: 'No simulations yet',
              description:
                'Run a simulation to see how Cherry would route a swipe across your cards and buckets.',
            }}
            error={error}
          />
        </Panel>

        <Panel
          tone="muted"
          title="Run a simulation"
          description="Enter dollars; we convert to cents before calling the API. Categories must match your buckets/rules."
        >
          <Card tone="base" padding="md">
            <RunSimulationForm />
          </Card>
        </Panel>
      </div>
    </div>
  );
}

function SimulationFilters({
  status,
  category,
  page,
}: {
  status: string;
  category: string;
  page: number;
}) {
  const statusValue = hasText(status) ? status : 'ALL';
  const categoryValue = hasText(category) ? category : '';
  const inputClasses =
    'rounded-lg border border-[rgba(27,38,69,0.6)] bg-[#0b1021] px-3 py-2 text-sm text-[#f8fafc] placeholder:text-[#a5b0d0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff6b8a]';
  return (
    <form method="get" className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <label className="block text-[11px] uppercase tracking-[0.12em] text-[#c3cce5]">
          Status
        </label>
        <select
          name="status"
          defaultValue={statusValue}
          className={inputClasses}
        >
          <option value="ALL">All</option>
          <option value="APPROVED">Approved</option>
          <option value="DECLINED">Declined</option>
        </select>
      </div>
      <div className="space-y-1">
        <label className="block text-[11px] uppercase tracking-[0.12em] text-[#c3cce5]">
          Category
        </label>
        <input
          name="category"
          defaultValue={categoryValue}
          className={inputClasses}
          placeholder="DINING"
        />
      </div>
      <input type="hidden" name="page" value={page} />
      <Button type="submit" size="sm" variant="primary" className="mt-4">
        Apply
      </Button>
    </form>
  );
}

function SimulationPagination({
  total,
  page,
  pageSize,
  status,
  category,
  totalPages,
}: {
  total: number;
  page: number;
  pageSize: number;
  status: string;
  category: string;
  totalPages: number;
}) {
  const params = new URLSearchParams();
  if (hasText(status) && status !== 'ALL') params.set('status', status);
  if (hasText(category)) params.set('category', category);
  params.set('pageSize', String(pageSize));

  const prevPage = page > 1 ? page - 1 : 1;
  const nextPage = page < totalPages ? page + 1 : totalPages;

  const prevParams = new URLSearchParams(params);
  prevParams.set('page', String(prevPage));

  const nextParams = new URLSearchParams(params);
  nextParams.set('page', String(nextPage));

  return (
    <div className="flex flex-col gap-3 text-sm text-[#c3cce5] md:flex-row md:items-center md:justify-between">
      <p className="text-xs text-[#a5b0d0]">
        Page {page} of {totalPages} · {total} total
      </p>
      <div className="flex items-center gap-2">
        <ButtonLink
          href={`/simulate?${prevParams.toString()}`}
          variant="ghost"
          size="sm"
          className={page === 1 ? 'pointer-events-none opacity-60' : ''}
          aria-disabled={page === 1}
        >
          Prev
        </ButtonLink>
        <ButtonLink
          href={`/simulate?${nextParams.toString()}`}
          variant="ghost"
          size="sm"
          className={page === totalPages ? 'pointer-events-none opacity-60' : ''}
          aria-disabled={page === totalPages}
        >
          Next
        </ButtonLink>
      </div>
    </div>
  );
}
