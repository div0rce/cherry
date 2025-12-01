import type { JSX } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { RunSimulationForm, DeleteSimulationButton } from './client';
import { getBaseUrl } from '@/lib/base-url';
import { getCurrentUserId } from '@/lib/auth';
import type { SimulationHistoryItem } from '@/components/simulations/simulation-history-list';
import { SimulationHistoryList } from '@/components/simulations/simulation-history-list';

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
    const cardDisplayName = sim.chosenCard
      ? `${sim.chosenCard.nickname} (${sim.chosenCard.issuer} · ${sim.chosenCard.network})`
      : sim.chosenCardName ?? null;
    const bucketLabel = sim.bucketName ?? sim.bucket?.name ?? null;
    const bucketCategory = sim.bucket?.category ?? sim.resolvedCategory;
    const bucketLimit = sim.bucketLimitCents ?? sim.bucket?.budgetAmount ?? null;
    const bucketRemainingBefore = sim.bucketBeforeCents;
    const bucketRemainingAfter = sim.bucketAfterCents ?? sim.bucket?.currentAmount ?? null;
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
    ].filter(Boolean);
    const bucketDisciplineLabel =
      bucketStrictFlag == null ? null : bucketStrictFlag ? '(strict)' : '(soft)';
    const bucketMeta = [bucketCategory ? `Category ${bucketCategory}` : null, bucketLabel].filter(
      Boolean
    ) as string[];

    return {
      id: sim.id,
      createdAt: sim.createdAt,
      title: `${formatCents(sim.amount)} · ${sim.resolvedCategory}${
        sim.mccCode ? ` · MCC ${sim.mccCode}` : ''
      }`,
      subtitle: sim.merchantName || 'Merchant N/A',
      status: sim.status,
      statusTone: sim.status === 'APPROVED' ? 'positive' : 'negative',
      meta: bucketMeta,
      body: (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-slate-900/70 p-3 space-y-1">
            <p className="text-[11px] uppercase tracking-label-tight text-slate-400">Card</p>
            {cardDisplayName ? (
              <p className="text-sm font-semibold text-white">{cardDisplayName}</p>
            ) : (
              <p className="text-sm text-slate-500">None (declined/no card)</p>
            )}
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-900/70 p-3 space-y-1">
            <p className="text-[11px] uppercase tracking-label-tight text-slate-400">Bucket</p>
            {bucketLabel ? (
              <div className="text-sm text-slate-200">
                <p className="font-semibold text-white">
                  {bucketLabel}
                  {bucketCategory ? ` · ${bucketCategory}` : ''}
                </p>
                <p className="text-slate-400">
                  {bucketDetails.length > 0 ? bucketDetails.join(' · ') : 'No tracked balances'}
                  {bucketDisciplineLabel ? ` ${bucketDisciplineLabel}` : ''}
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
          <span>Reason: {sim.reason || '—'}</span>
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
  if (query.status) params.set('status', query.status);
  if (query.category) params.set('category', query.category);
  if (query.page) params.set('page', String(query.page));
  if (query.pageSize) params.set('pageSize', String(query.pageSize));

  const queryString = params.toString();
  const url = queryString ? `/api/simulations?${queryString}` : '/api/simulations';

  const baseUrl = getBaseUrl();
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join('; ');
  const init: RequestInit = { cache: 'no-store' };
  if (cookieHeader) {
    init.headers = { cookie: cookieHeader };
  }
  const res = await fetch(`${baseUrl}${url}`, init);

  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || 'Failed to load simulations');
  }

  const data = (await res.json()) as SimulationResponse;
  return data;
}

export default async function SimulatePage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<JSX.Element> {
  const resolvedParams = (await searchParams) || {};
  try {
    await getCurrentUserId();
  } catch {
    redirect(`/signin?callbackUrl=${encodeURIComponent('/simulate')}`);
  }

  const statusParam =
    typeof resolvedParams['status'] === 'string' ? resolvedParams['status'] : '';
  const categoryParam =
    typeof resolvedParams['category'] === 'string' ? resolvedParams['category'] : '';
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
      ...(statusParam ? { status: statusParam } : {}),
      ...(categoryParam ? { category: categoryParam } : {}),
    };
    response = await fetchSimulations(query);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load simulations';
  }

  const simulations = response?.data ?? [];
  const total = response?.total ?? 0;
  const pageSize = response?.pageSize ?? 10;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const historyItems = toHistoryItems(simulations);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-8 text-slate-100">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-label text-pink-200">Cherry Lab</p>
        <h1 className="text-3xl font-semibold text-white">Simulate spend</h1>
        <p className="text-slate-300">
          Post simulated transactions and see the engine decision history (card, bucket, rewards).
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-[2fr,1fr]">
        <section className="space-y-4">
          <SimulationHistoryList
            items={historyItems}
            title="Simulation history"
            subtitle="Recent simulated swipes with bucket and card decisions."
            headerAction={
              <Link href="/cards" className="text-sm text-pink-200 hover:text-pink-100">
                Manage cards →
              </Link>
            }
            toolbar={
              <SimulationFilters
                status={statusParam || 'ALL'}
                category={categoryParam || ''}
                page={page}
              />
            }
            footer={
              <SimulationPagination
                total={total}
                page={page}
                pageSize={pageSize}
                status={statusParam || 'ALL'}
                category={categoryParam || ''}
                totalPages={totalPages}
              />
            }
            emptyState={{
              title: 'No simulations yet',
              body: 'Run a simulation to see how Cherry would route a swipe across your cards and buckets.',
              hint: 'Use the form on the right to post a scenario and we will show it here.',
            }}
            error={error}
          />
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-white/5 bg-slate-950/60 shadow-lg backdrop-blur p-4 text-slate-100">
            <h3 className="mb-2 text-base font-semibold text-white">Run a simulation</h3>
            <p className="mb-3 text-sm text-slate-400">
              Enter dollars; we convert to cents before calling the API. Categories must match your buckets/rules.
            </p>
            <RunSimulationForm />
          </div>
        </section>
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
  return (
    <form method="get" className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <label className="block text-[11px] uppercase tracking-label-tight text-slate-400">
          Status
        </label>
        <select
          name="status"
          defaultValue={status || 'ALL'}
          className="rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 focus:border-pink-500 focus:outline-none"
        >
          <option value="ALL">All</option>
          <option value="APPROVED">Approved</option>
          <option value="DECLINED">Declined</option>
        </select>
      </div>
      <div className="space-y-1">
        <label className="block text-[11px] uppercase tracking-label-tight text-slate-400">
          Category
        </label>
        <input
          name="category"
          defaultValue={category}
          className="rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-pink-500 focus:outline-none"
          placeholder="DINING"
        />
      </div>
      <input type="hidden" name="page" value={page} />
      <button
        type="submit"
        className="mt-5 rounded-lg bg-pink-600/80 px-3 py-2 text-sm font-semibold text-white transition hover:bg-pink-600 focus-visible:outline-2 focus-visible:outline-pink-400"
      >
        Apply
      </button>
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
  if (status && status !== 'ALL') params.set('status', status);
  if (category) params.set('category', category);
  params.set('pageSize', String(pageSize));

  const prevPage = page > 1 ? page - 1 : 1;
  const nextPage = page < totalPages ? page + 1 : totalPages;

  const prevParams = new URLSearchParams(params);
  prevParams.set('page', String(prevPage));

  const nextParams = new URLSearchParams(params);
  nextParams.set('page', String(nextPage));

  return (
    <div className="flex flex-col gap-3 text-sm text-slate-300 md:flex-row md:items-center md:justify-between">
      <p className="text-xs text-slate-400">
        Page {page} of {totalPages} · {total} total
      </p>
      <div className="flex items-center gap-2">
        <Link
          href={`/simulate?${prevParams.toString()}`}
          className={`rounded-lg border px-3 py-2 text-sm transition ${
            page === 1
              ? 'cursor-not-allowed border-white/5 text-slate-500'
              : 'border-white/10 text-slate-100 hover:bg-white/5'
          }`}
          aria-disabled={page === 1}
        >
          Prev
        </Link>
        <Link
          href={`/simulate?${nextParams.toString()}`}
          className={`rounded-lg border px-3 py-2 text-sm transition ${
            page === totalPages
              ? 'cursor-not-allowed border-white/5 text-slate-500'
              : 'border-white/10 text-slate-100 hover:bg-white/5'
          }`}
          aria-disabled={page === totalPages}
        >
          Next
        </Link>
      </div>
    </div>
  );
}
