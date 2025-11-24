import Link from 'next/link';
import { RunSimulationForm, DeleteSimulationButton } from './client';

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
  bucketBeforeCents: number | null;
  bucketAfterCents: number | null;
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
  return '—';
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
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : 'http://localhost:3000');

  const params = new URLSearchParams();
  if (query.status) params.set('status', query.status);
  if (query.category) params.set('category', query.category);
  if (query.page) params.set('page', String(query.page));
  if (query.pageSize) params.set('pageSize', String(query.pageSize));

  const queryString = params.toString();
  const url = queryString ? `${base}/api/simulations?${queryString}` : `${base}/api/simulations`;

  const res = await fetch(url, {
    cache: 'no-store',
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || 'Failed to load simulations');
  }

  return res.json();
}

export default async function SimulatePage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = (await searchParams) || {};

  const statusParam = typeof resolvedParams.status === 'string' ? resolvedParams.status : '';
  const categoryParam =
    typeof resolvedParams.category === 'string' ? resolvedParams.category : '';
  const pageParam = Number.parseInt(
    typeof resolvedParams.page === 'string' ? resolvedParams.page : '1',
    10
  );
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  let response: SimulationResponse | null = null;
  let error: string | null = null;

  try {
    response = await fetchSimulations({
      status: statusParam || undefined,
      category: categoryParam || undefined,
      page,
      pageSize: 10,
    });
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load simulations';
  }

  const simulations = response?.data ?? [];
  const total = response?.total ?? 0;
  const pageSize = response?.pageSize ?? 10;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Cherry Lab</p>
        <h1 className="text-3xl font-semibold">Simulate spend</h1>
        <p className="text-slate-500">
          Post simulated transactions and see the engine decision history (card, bucket, rewards).
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-[2fr,1fr]">
        <section className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white/60 shadow-sm backdrop-blur">
            <div className="border-b border-slate-200 px-4 py-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Simulation history</h2>
              <Link href="/cards" className="text-sm text-blue-600 hover:text-blue-700">
                Manage cards →
              </Link>
            </div>
            {error ? (
              <div className="p-4 text-sm text-red-600">{error}</div>
            ) : (
              <>
                <SimulationFilters
                  status={statusParam || 'ALL'}
                  category={categoryParam || ''}
                  page={page}
                />
                {simulations.length === 0 ? (
                  <div className="p-4 text-sm text-slate-500">
                    No simulations yet. Run one on the right.
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-200">
                    {simulations.map((sim) => (
                      <li key={sim.id} className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm text-slate-500">
                              {new Date(sim.createdAt).toLocaleString()}
                            </p>
                            <p className="text-lg font-semibold">
                              {formatCents(sim.amount)} · {sim.resolvedCategory}
                              {sim.mccCode ? ` · MCC ${sim.mccCode}` : ''}
                            </p>
                            <p className="text-sm text-slate-500">
                              {sim.merchantName || 'Merchant N/A'}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                sim.status === 'APPROVED'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {sim.status}
                            </div>
                            <DeleteSimulationButton simulationId={sim.id} />
                          </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                            <p className="text-xs uppercase text-slate-500 tracking-[0.1em]">Card</p>
                            {sim.chosenCard ? (
                              <p className="text-sm font-semibold">
                                {sim.chosenCard.nickname} ({sim.chosenCard.issuer} · {sim.chosenCard.network})
                              </p>
                            ) : (
                              <p className="text-sm text-slate-500">None (declined/no card)</p>
                            )}
                          </div>

                          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                            <p className="text-xs uppercase text-slate-500 tracking-[0.1em]">Bucket</p>
                            {sim.bucket ? (
                              <div className="text-sm">
                                <p className="font-semibold">
                                  {sim.bucket.name} · {sim.bucket.category}
                                </p>
                                <p className="text-slate-500">
                                  Remaining: {formatCents(sim.bucket.currentAmount)} /{' '}
                                  {formatCents(sim.bucket.budgetAmount)}{' '}
                                  {sim.bucket.strictMode ? '(strict)' : '(soft)'}
                                </p>
                              </div>
                            ) : (
                              <p className="text-sm text-slate-500">No bucket matched</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-sm text-slate-600">
                          <p>Reason: {sim.reason || '—'}</p>
                          <p>Rewards: {formatRewards(sim)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <SimulationPagination
                  total={total}
                  page={page}
                  pageSize={pageSize}
                  status={statusParam || 'ALL'}
                  category={categoryParam || ''}
                  totalPages={totalPages}
                />
              </>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white/60 shadow-sm backdrop-blur p-4">
            <h3 className="text-base font-semibold mb-2">Run a simulation</h3>
            <p className="text-sm text-slate-500 mb-3">
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
    <form method="get" className="flex flex-wrap items-end gap-3 px-4 py-3 border-b border-slate-200">
      <div className="space-y-1">
        <label className="block text-xs uppercase tracking-[0.15em] text-slate-500">Status</label>
        <select
          name="status"
          defaultValue={status || 'ALL'}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="ALL">All</option>
          <option value="APPROVED">Approved</option>
          <option value="DECLINED">Declined</option>
        </select>
      </div>
      <div className="space-y-1">
        <label className="block text-xs uppercase tracking-[0.15em] text-slate-500">Category</label>
        <input
          name="category"
          defaultValue={category}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          placeholder="DINING"
        />
      </div>
      <input type="hidden" name="page" value={page} />
      <button
        type="submit"
        className="mt-5 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
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
    <div className="flex items-center justify-between px-4 py-3 text-sm text-slate-600">
      <p>
        Page {page} of {totalPages} · {total} total
      </p>
      <div className="flex items-center gap-2">
        <Link
          href={`/simulate?${prevParams.toString()}`}
          className={`rounded-md px-3 py-2 border ${
            page === 1 ? 'border-slate-200 text-slate-400' : 'border-slate-300 hover:bg-slate-50'
          }`}
          aria-disabled={page === 1}
        >
          Prev
        </Link>
        <Link
          href={`/simulate?${nextParams.toString()}`}
          className={`rounded-md px-3 py-2 border ${
            page === totalPages
              ? 'border-slate-200 text-slate-400'
              : 'border-slate-300 hover:bg-slate-50'
          }`}
          aria-disabled={page === totalPages}
        >
          Next
        </Link>
      </div>
    </div>
  );
}
