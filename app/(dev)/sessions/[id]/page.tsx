import type { JSX } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUserId } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { deriveDisplayStatus } from '@/lib/sessions/summaries';
import { PageHeader } from '@/components/ui/page-header';
import { Panel } from '@/components/ui/panel';
import { Card } from '@/components/ui/card';
import { ButtonLink } from '@/components/ui/Button';

function formatCents(amount: number | null | undefined) {
  if (amount == null) return '—';
  return `$${(amount / 100).toFixed(2)}`;
}

export default async function SessionDetailPage({
  params,
}: {
  params: { id: string };
}): Promise<JSX.Element | null> {
  let userId: string;
  try {
    userId = await getCurrentUserId();
  } catch {
    redirect('/signin');
    return null;
  }

  const { id } = params;
  const session = await prisma.recommendationSession.findFirst({
    where: { id, userId },
    include: {
      ledgerEntries: true,
      recommendedBucket: { select: { name: true, budgetAmount: true, strictMode: true } },
      recommendedCard: { select: { nickname: true } },
    },
  });

  if (!session) {
    redirect('/sessions');
    return null;
  }

  const now = new Date();
  const status = deriveDisplayStatus(session, session.ledgerEntries ?? [], now);
  const pointsPosted =
    session.ledgerEntries
      ?.filter((l) => l.status === 'POSTED')
      .reduce((acc, l) => acc + l.points, 0) ?? 0;
  const pointsPending =
    session.ledgerEntries
      ?.filter((l) => l.status === 'PENDING')
      .reduce((acc, l) => acc + l.points, 0) ?? 0;
  const firstLedger = session.ledgerEntries?.[0];
  const firstLedgerDate = firstLedger ? firstLedger.awardedAt ?? firstLedger.createdAt : null;
  const postedLedger = session.ledgerEntries?.find((l) => l.status === 'POSTED') ?? null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        label="Engine"
        badge="Dev / Lab Tool"
        title={session.merchantName ?? 'Manual scan'}
        description={`Session amount ${formatCents(session.amountCents)} · ${session.category} · Created ${new Date(session.createdAt).toLocaleString()}`}
        actions={
          <ButtonLink href="/sessions" variant="secondary" size="sm">
            Back to sessions
          </ButtonLink>
        }
      />

      <Card tone="muted" padding="md" className="space-y-2">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-ink-700/60 bg-ink-800/70 px-2 py-1 font-semibold text-cloud-100">
            Source: {session.source}
          </span>
          <span className="rounded-full border border-ink-700/60 bg-ink-800/70 px-2 py-1 font-semibold text-cloud-100">
            Verdict: {session.verdict}
          </span>
          <span className="rounded-full border border-ink-700/60 bg-ink-800/70 px-2 py-1 font-semibold text-cloud-100">
            Status: {status}
          </span>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel tone="muted" title="Bucket impact">
          <p className="text-sm text-cloud-300">
            {session.recommendedBucket
              ? `Bucket: ${session.recommendedBucket.name} (${formatCents(session.recommendedBucket.budgetAmount)})`
              : 'No bucket matched this scan.'}
          </p>
          <p className="text-sm text-cloud-300">
            Strict mode: {session.recommendedBucket?.strictMode ? 'On' : 'Off'}
          </p>
        </Panel>

        <Panel tone="muted" title="Points">
          <div className="space-y-1 text-sm text-cloud-200">
            <p>Offered: {session.cherryPointsOffered ?? 0}</p>
            <p>Pending: {pointsPending}</p>
            <p>Posted: {pointsPosted}</p>
          </div>
          <p className="mt-2 text-xs text-cloud-400">
            {pointsPosted > 0
              ? 'Points posted for this session.'
              : pointsPending > 0
                ? 'Points are pending verification.'
                : status === 'EXPIRED'
                  ? 'Session expired without points.'
                  : 'Start and confirm the session to earn points.'}
          </p>
        </Panel>
      </div>

      <Panel tone="muted" title="Timeline">
        <ul className="mt-2 space-y-2 text-sm text-cloud-200">
          <li>Recommendation generated · {new Date(session.createdAt).toLocaleString()}</li>
          {pointsPending > 0 && (
            <li>
              Session confirmed ·{' '}
              {firstLedgerDate ? new Date(firstLedgerDate).toLocaleString() : ''}
            </li>
          )}
          {pointsPosted > 0 && (
            <li>
              Points posted ·{' '}
              {new Date((postedLedger?.awardedAt ?? session.updatedAt).getTime()).toLocaleString()}
            </li>
          )}
          {status === 'EXPIRED' && <li>Session expired · {new Date(session.expiresAt).toLocaleString()}</li>}
        </ul>
      </Panel>
    </div>
  );
}
