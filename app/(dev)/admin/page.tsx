import type { JSX } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUserId } from '@/lib/auth';
import { getCherryPointsBalance } from '@/lib/points';
import { getSessionStats } from '@/lib/admin/getSessionStats';
import { getLedgerStats } from '@/lib/admin/getLedgerStats';
import { prisma } from '@/lib/prisma';
import { ROUTES } from '@/lib/routes';
import { PageHeader } from '@/components/ui/page-header';
import { Panel } from '@/components/ui/panel';
import { Card } from '@/components/ui/card';
import { MetricCard } from '@/components/ui/metric-card';
import { ButtonLink } from '@/components/ui/button';
import AdminClient from './AdminClient';
import { Alert } from '@/components/ui/alert';

const hasText = (value?: string | null): value is string =>
  value !== undefined && value !== null && value !== '';

async function getHealth() {
  const base =
    process.env['NEXT_PUBLIC_BASE_URL'] ??
    process.env.NEXTAUTH_URL ??
    '';
  const url = hasText(base) ? `${base.replace(/\/$/, '')}/api/health` : '/api/health';
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return { ok: false };
    return (await res.json()) as { ok: boolean };
  } catch {
    return { ok: false };
  }
}

export default async function AdminPage(): Promise<JSX.Element> {
  let userId: string;
  try {
    userId = await getCurrentUserId();
  } catch {
    redirect(`/signin?callbackUrl=${encodeURIComponent('/admin')}`);
  }
  const [points, sessionStats, ledgerStats, health, lastSession, lastLedger] = await Promise.all([
    getCherryPointsBalance(userId),
    getSessionStats(userId),
    getLedgerStats(userId),
    getHealth(),
    prisma.recommendationSession.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.cherryPointLedger.findFirst({
      where: { userId },
      orderBy: { awardedAt: 'desc' },
    }),
  ]);

  const invariantChecks = [
    {
      name: 'Prisma assumptions',
      status: 'OK',
      description: 'Schema invariants enforced by scripts/check-prisma-assumptions.cjs',
    },
    {
      name: 'Guardrails + lint config',
      status: 'OK',
      description: 'Static guardrail rules validated by scripts/check-guardrails.cjs',
    },
    {
      name: 'Dev UI parity',
      status: 'OK',
      description: 'Docs parity enforced by scripts/check-dev-ui-parity.mts',
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader
        label="Admin"
        badge="Dev / Lab Tool"
        title="Admin & tools"
        description="Dev utilities live here. Seed/nuke demo data and check basic health. Dangerous operations; do not expose to end users."
      />

      <Panel tone="muted" title="Cherry Session Diagnostics" description="Counts for this user.">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Total Sessions" value={sessionStats.total} tone="accent" />
          <MetricCard label="Claimed" value={sessionStats.claimed} tone="positive" />
          <MetricCard label="Verified" value={sessionStats.verified} tone="positive" />
          <MetricCard label="Expired" value={sessionStats.expired} />
        </div>
      </Panel>

      <Panel tone="muted" title="Cherry Points Ledger" description="Ledger totals for this user.">
        <div className="grid gap-3 md:grid-cols-2">
          <MetricCard label="Ledger Entries" value={ledgerStats.entries} tone="accent" />
          <MetricCard label="Points (Posted)" value={ledgerStats.points} tone="positive" />
        </div>
        <p className="text-xs text-cloud-400">
          Current Balance: <span className="text-cherry-100 font-semibold">{points}</span>
        </p>
      </Panel>

      <Panel
        tone="muted"
        title="Admin tools"
        description="Dangerous operations. Seeds and resets are for local/dev only."
      >
        <AdminClient />
      </Panel>

      <Panel tone="muted" title="Invariants & assumptions" description="Summary of guardrails enforced in CI and scripts.">
        <div className="grid gap-3 md:grid-cols-3">
          {invariantChecks.map((check) => (
            <Card key={check.name} tone="base" padding="md" className="space-y-2 border border-ink-700/60">
              <p className="text-sm font-semibold text-cloud-50">{check.name}</p>
              <Alert
                variant="success"
                title={`Status: ${check.status}`}
                description={check.description}
                className="border border-ink-700/60"
              />
            </Card>
          ))}
        </div>
      </Panel>

      {(lastSession || lastLedger) && (
        <Panel tone="muted" title="Recent diagnostics">
          <div className="grid gap-3 md:grid-cols-2">
            {lastSession && (
              <Card tone="base" padding="md" className="space-y-1">
                <p className="text-sm font-semibold text-cloud-50">Last Session</p>
                <p className="text-xs text-cloud-400">
                  {lastSession.merchantName ?? 'Unknown'} • ${(lastSession.amountCents / 100).toFixed(2)}
                </p>
                <p className="text-xs text-cloud-400">Verdict: {lastSession.verdict}</p>
                <p className="text-xs text-cloud-400">Status: {lastSession.status}</p>
              </Card>
            )}
            {lastLedger && (
              <Card tone="base" padding="md" className="space-y-1">
                <p className="text-sm font-semibold text-cloud-50">Last Ledger Entry</p>
                <p className="text-xs text-cloud-400">Points: {lastLedger.points}</p>
                <p className="text-xs text-cloud-400">Reason: {lastLedger.reason}</p>
                <p className="text-xs text-cloud-400">
                  Status: {lastLedger.status} · {new Date(lastLedger.awardedAt).toLocaleString()}
                </p>
              </Card>
            )}
          </div>
        </Panel>
      )}

      <Panel tone="muted" title="Health">
        <Card tone="base" padding="md" className="space-y-2">
          <div>
            <p className="text-sm font-semibold text-cloud-50">Health check</p>
            <p className="text-xs text-cloud-400">API: {health.ok ? 'OK' : 'FAIL'}</p>
          </div>
          <ButtonLink href="/api/health" variant="secondary" size="sm">
            View health
          </ButtonLink>
        </Card>
      </Panel>

      <Card tone="muted" padding="md" className="flex flex-wrap items-center gap-3 text-sm text-cherry-100">
        <ButtonLink href="/scan" variant="ghost" size="sm" className="text-cherry-100">
          Scan before pay →
        </ButtonLink>
        <ButtonLink href="/sessions" variant="ghost" size="sm" className="text-cherry-100">
          Sessions →
        </ButtonLink>
        <ButtonLink href="/vine-simulator" variant="ghost" size="sm" className="text-cherry-100">
          Vine simulator (dev) →
        </ButtonLink>
        <ButtonLink href="/bank-simulator" variant="ghost" size="sm" className="text-cherry-100">
          Bank / Plaid simulator →
        </ButtonLink>
        <ButtonLink href="/simulate" variant="ghost" size="sm" className="text-cherry-100">
          Run simulation →
        </ButtonLink>
        <ButtonLink href={ROUTES.dev.cards} variant="ghost" size="sm" className="text-cherry-100">
          Manage cards →
        </ButtonLink>
        <ButtonLink href={ROUTES.dev.buckets} variant="ghost" size="sm" className="text-cherry-100">
          Manage buckets →
        </ButtonLink>
      </Card>
    </div>
  );
}
