import type { JSX } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUserId } from '@/lib/auth';
import { fetchSessionSummaries } from '@/lib/sessions/summaries';
import { SessionsPageClient } from './SessionsPageClient';

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

  const { items } = await fetchSessionSummaries(userId, {
    status: statusParam,
    limit: 50,
  });

  return <SessionsPageClient initialSummaries={items} initialStatus={statusParam} />;
}
