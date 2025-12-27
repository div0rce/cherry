import type { JSX } from 'react';
import { notFound } from 'next/navigation';
import { getCurrentUserIdOrRedirect } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';
import { PageHeader } from '../../../../components/ui/page-header';
import { Panel } from '../../../../components/ui/panel';
import { MetricCard } from '../../../../components/ui/metric-card';
import { EmptyState } from '../../../../components/ui/empty-state';
import { assertOfflineEvaluatorModelsReady } from '../../../../lib/evaluator/prisma-safe';
import {
  computeOfflineStats,
  getOfflineEvaluatorDebugInfo,
  type EvaluationWithTx,
} from '../../../../lib/evaluator/stats';
import { defaultRunIdForUser } from '../../../../lib/evaluator/offline-history';
import { ROUTES } from '../../../../lib/routes';
import { getServerConfig } from '../../../../lib/config/store';

const hasText = (value?: string | null): value is string =>
  value !== undefined && value !== null && value !== '';

function formatAmount(minor: number | null | undefined, direction: string): string {
  if (minor == null) return '—';
  const sign = direction === 'CREDIT' ? '+' : '-';
  const abs = Math.abs(minor) / 100;
  return `${sign}$${abs.toFixed(2)}`;
}

export default async function OfflineEvaluatorPage(): Promise<JSX.Element> {
  const serverConfig = getServerConfig();
  if (serverConfig.environment === 'production') {
    notFound();
  }

  const offlineEnabled = serverConfig.offlineEvaluatorEnabled;

  if (!offlineEnabled) {
    return (
      <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-4xl space-y-4">
          <PageHeader
            label="Dev"
            title="Offline evaluator"
            description="Disabled in this environment. Enable by setting CHERRY_OFFLINE_EVALUATOR_ENABLED=true, then apply Prisma migrations and restart the dev server."
          />
          <Panel
            title="Offline evaluator disabled"
            description="This surface is diagnostic-only. To enable it, set CHERRY_OFFLINE_EVALUATOR_ENABLED=true and restart after running migrations."
          >
            <p className="text-sm text-slate-300">
              If you just added income regime models, run <code className="font-mono text-xs">npx prisma migrate deploy</code>{' '}
              and <code className="font-mono text-xs">npx prisma generate</code> before starting <code className="font-mono text-xs">npm run dev</code>.
            </p>
          </Panel>
        </div>
      </main>
    );
  }

  await assertOfflineEvaluatorModelsReady();
  const userId = await getCurrentUserIdOrRedirect(ROUTES.dev.evaluator);
  const latestRunAnchor =
    (await prisma.historicalEngineEvaluation.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }))?.createdAt ?? null;
  const defaultRunId = latestRunAnchor
    ? defaultRunIdForUser(userId, latestRunAnchor)
    : defaultRunIdForUser(userId, new Date(Date.UTC(1970, 0, 1)));

  let evaluations = (await prisma.historicalEngineEvaluation.findMany({
    where: { userId, runId: defaultRunId },
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: { bankTransaction: true },
  })) as EvaluationWithTx[];

  if (evaluations.length === 0) {
    const latest = await prisma.historicalEngineEvaluation.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { runId: true },
    });
    if (hasText(latest?.runId)) {
      evaluations = (await prisma.historicalEngineEvaluation.findMany({
        where: { userId, runId: latest.runId },
        orderBy: { createdAt: 'desc' },
        take: 200,
        include: { bankTransaction: true },
      })) as EvaluationWithTx[];
    }
  }

  const [regimeCount, bucketTemplateCount, bankTxCount] = await Promise.all([
    prisma.historicalIncomeRegime.count({ where: { userId } }),
    prisma.historicalBucketTemplate.count({ where: { userId } }),
    prisma.bankTransaction.count({ where: { userId, source: 'csv_dev' } }),
  ]);

  const debug = await getOfflineEvaluatorDebugInfo(userId);

  const cardIds = Array.from(
    new Set(evaluations.map((row) => row.cardId).filter((id): id is string => Boolean(id))),
  );

  const cards =
    cardIds.length > 0
      ? await prisma.card.findMany({ where: { id: { in: cardIds } }, select: { id: true, nickname: true } })
      : [];

  const cardMap = new Map(cards.map((c) => [c.id, c.nickname]));

  const stats = computeOfflineStats(evaluations);
  const missingSetup = bankTxCount === 0 || regimeCount === 0 || bucketTemplateCount === 0;
  const lowSampleNotes: string[] = [];
  if (stats.bucketSampleSize < 5) lowSampleNotes.push(`Bucket stress sample is low (n=${stats.bucketSampleSize}).`);
  if (stats.rewardSampleSize < 5) lowSampleNotes.push(`Reward uplift sample is low (n=${stats.rewardSampleSize}).`);
  if (stats.highPainSampleSize < 3) lowSampleNotes.push(`High-pain warnings sample is low (n=${stats.highPainSampleSize}).`);

  return (
    <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader
          label="Dev"
          title="Offline evaluator"
          description="Read-only replay of SafeBalance transactions through the Cherry engine. No sessions, no ledger writes."
        />

        {missingSetup ? (
          <Panel
            title="Offline evaluator not ready"
            description="Load CSV dev data, classify income/P2P, and build income regimes before running evaluations."
          >
            <EmptyState
              title="No regimes or templates yet"
              description="Run the ingest + evaluator scripts for this user to generate income regimes and bucket templates. If you recently added Prisma models, run migrations/generate and restart dev server. This page is read-only and will not auto-run anything."
              actionNode={
                <div className="text-left text-xs text-slate-200">
                  <p className="mb-1 font-semibold">Steps</p>
                  <ol className="list-decimal space-y-1 pl-4">
                    <li>Set <code className="font-mono text-[11px]">BANK_INGEST_USER_EMAIL=&lt;you&gt;</code></li>
                    <li>
                      Run <code className="font-mono text-[11px]">npm run dev:ingest:moustafa-bank</code> then{' '}
                      <code className="font-mono text-[11px]">npm run dev:evaluator:moustafa</code>
                    </li>
                    <li>
                      If Prisma models were just added: <code className="font-mono text-[11px]">npx prisma migrate deploy</code> →
                      <code className="font-mono text-[11px]">npx prisma generate</code> → restart <code className="font-mono text-[11px]">npm run dev</code>.
                    </li>
                    <li>Refresh this page after the evaluator finishes.</li>
                  </ol>
                </div>
              }
            />
          </Panel>
        ) : (
          <>
            {stats.engineRan < 10 ? (
              <div className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                Offline evaluator ran on fewer than 10 debits; metrics may be noisy. Ingest more data or rerun the evaluator for this user.
              </div>
            ) : null}

            {lowSampleNotes.length > 0 ? (
              <div className="rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-xs text-slate-300">
                {lowSampleNotes.map((note) => (
                  <p key={note}>{note}</p>
                ))}
              </div>
            ) : null}

            <section className="grid gap-3 md:grid-cols-3">
              <MetricCard
                label="Bucket stress"
                value={
                  stats.bucketSampleSize === 0
                    ? '—'
                    : `${Math.round((stats.nearBucketEdgeCount / Math.max(stats.bucketSampleSize, 1)) * 100)}%`
                }
                helper={`${stats.nearBucketEdgeCount}/${stats.bucketSampleSize} tx landed in ≥80% buckets (regime-aware)`}
              />
              <MetricCard
                label="Soft intervention opps"
                value={
                  stats.bucketSampleSize === 0
                    ? '—'
                    : `${Math.round(
                        (stats.wouldHaveSoftIntervenedCount / Math.max(stats.bucketSampleSize, 1)) * 100,
                      )}%`
                }
                helper={`${stats.wouldHaveSoftIntervenedCount}/${stats.bucketSampleSize} tx where advice keeps buckets under threshold`}
              />
              <MetricCard
                label="Reward uplift cases"
                value={
                  stats.rewardSampleSize === 0
                    ? '—'
                    : `${Math.round((stats.betterRewardCount / Math.max(stats.rewardSampleSize, 1)) * 100)}%`
                }
                helper={`${stats.betterRewardCount}/${stats.rewardSampleSize} tx with ≥0.5% better card than baseline`}
              />
              <MetricCard
                label="High-pain coverage"
                value={
                  stats.highPainSampleSize === 0
                    ? '—'
                    : `${Math.round(
                        (stats.highPainWarningCount / Math.max(stats.highPainSampleSize, 1)) * 100,
                      )}%`
                }
                helper={`${stats.highPainWarningCount}/${stats.highPainSampleSize} debits ≥ $50 with a warning/guardrail`}
              />
            </section>

            <Panel
              title="Recent evaluations"
              description="Top 200 offline engine decisions joined to historical bank transactions (csv_dev)."
            >
              <div className="space-y-3">
                {serverConfig.enableDevTools && (
                  <div className="mb-1 text-xs text-slate-500">
                    <p>
                      Debug: {debug.totalForUser} evaluations across {debug.distinctRunIds.length} runIds. Latest:{' '}
                      {debug.distinctRunIds.at(0)?.runId ?? 'n/a'}
                    </p>
                    <p>
                      Logged-in user: {userId}. Bank tx (csv_dev): {bankTxCount}; Eval count: {debug.totalForUser}; Regimes:{' '}
                      {regimeCount} (templates: {bucketTemplateCount})
                    </p>
                  </div>
                )}
                {evaluations.length === 0 && stats.totalDebits > 0 ? (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                    No evaluations found for this run/user. Ensure `BANK_INGEST_USER_*` matches your login when running
                    `npm run dev:evaluator:moustafa`.
                  </div>
                ) : null}
                <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                  {evaluations.length === 0 ? (
                    <div className="flex flex-col items-start gap-2">
                      <p className="text-base font-semibold text-slate-200">No evaluations yet</p>
                      <p className="text-sm text-slate-400">
                        Run <code className="font-mono text-xs">npm run dev:evaluator:moustafa</code> after ingesting the
                        CSV dataset with the same BANK_INGEST_USER_* user.
                      </p>
                    </div>
                  ) : (
                    <table className="min-w-full table-fixed text-sm text-slate-100">
                      <thead className="text-xs uppercase tracking-wide text-slate-400">
                        <tr>
                          <th className="px-3 py-2 text-left">Date</th>
                          <th className="px-3 py-2 text-left">Description</th>
                          <th className="px-3 py-2 text-right">Amount</th>
                          <th className="px-3 py-2 text-left">Decision</th>
                          <th className="px-3 py-2 text-left">Card</th>
                          <th className="px-3 py-2 text-left">Bucket</th>
                          <th className="px-3 py-2 text-left">Regime</th>
                          <th className="px-3 py-2 text-right">Run</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {evaluations.map((row) => (
                          <tr key={row.id}>
                            <td className="px-3 py-2 text-xs text-slate-400">
                              {row.bankTransaction.postedAt?.toISOString().slice(0, 10) ?? '—'}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {row.bankTransaction.description ?? row.bankTransaction.rawDescription ?? '—'}
                                </span>
                                <span className="text-xs text-slate-500">
                                  {hasText(row.bankTransaction.accountLast4)
                                    ? `•••• ${row.bankTransaction.accountLast4}`
                                    : ''}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right">
                              {formatAmount(row.bankTransaction.amountMinor, row.bankTransaction.direction)}
                            </td>
                            <td className="px-3 py-2 text-left">
                              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-200">
                                {row.decisionType}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-left text-xs text-slate-300">
                              {hasText(row.cardId) ? cardMap.get(row.cardId) ?? row.cardId : '—'}
                            </td>
                            <td className="px-3 py-2 text-left text-xs text-slate-300">
                              {row.bucketKey ?? '—'}
                            </td>
                            <td className="px-3 py-2 text-left text-xs text-slate-300">
                              {row.regimeId ?? '—'}
                            </td>
                            <td className="px-3 py-2 text-right text-xs text-slate-400">{row.runId}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                <div className="rounded-lg border border-white/5 bg-slate-900/60 p-3 text-xs text-slate-200">
                  <p className="mb-2 font-semibold">Amount distribution (share of engine runs)</p>
                  <ul className="space-y-1">
                    {[
                      { label: '< $10', count: stats.smallDebitCount },
                      { label: '$10–$50', count: stats.mediumDebitCount },
                      { label: '$50–$200', count: stats.largeDebitCount },
                      { label: '>= $200', count: stats.veryLargeDebitCount },
                    ].map((row) => {
                      const pct = stats.engineRan === 0 ? 0 : Math.round((row.count / stats.engineRan) * 100);
                      return (
                        <li key={row.label} className="flex items-center justify-between">
                          <span>{row.label}</span>
                          <span className="text-slate-400">
                            {row.count} ({pct}%)
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </Panel>
          </>
        )}
      </div>
    </main>
  );
}
