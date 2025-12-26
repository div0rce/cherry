import type { JSX } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUserId } from '../../../lib/auth.js';
import { fetchSessionSummaries } from '../../../lib/sessions/summaries.js';
import { SessionsPageClient } from './SessionsPageClient.js';
import { prisma } from '../../../lib/prisma.js';

export default async function SessionsPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}): Promise<JSX.Element | null> {
  let userId: string;
  try {
    userId = await getCurrentUserId();
  } catch {
    redirect(`/signin?callbackUrl=${encodeURIComponent('/sessions')}`);
    return null;
  }

  const params = searchParams ?? {};
  const rawStatus = typeof params['status'] === 'string' ? params['status'] : undefined;
  const statusParam = (rawStatus ?? 'all') as 'all' | 'active' | 'expired' | 'confirmed';

  const latestSession = await prisma.recommendationSession.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true, expiresAt: true },
  });
  const now =
    latestSession?.expiresAt ??
    latestSession?.createdAt ??
    new Date(Date.UTC(1970, 0, 1));

  const { items } = await fetchSessionSummaries(
    userId,
    {
      status: statusParam,
      limit: 50,
    },
    { now }
  );

  return <SessionsPageClient initialSummaries={items} initialStatus={statusParam} />;
}
