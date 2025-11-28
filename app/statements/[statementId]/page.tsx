import type { JSX } from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUserId } from '@/lib/auth';

export default async function StatementDetailPage({
  params,
}: {
  params: Promise<{ statementId: string }>;
}): Promise<JSX.Element | null> {
  const { statementId } = await params;
  try {
    await getCurrentUserId();
  } catch {
    redirect(`/signin?callbackUrl=${encodeURIComponent(`/statements/${statementId}`)}`);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-label text-pink-200">Statements</p>
        <h1 className="text-3xl font-semibold text-white">Statement {statementId}</h1>
        <p className="text-slate-300">
          Detailed statements not implemented yet. Use Purchase History for transaction-level data.
        </p>
      </header>

      <div className="rounded-2xl border border-white/5 bg-white/5 p-4 shadow-lg">
        <p className="text-sm text-slate-300">
          Placeholder view. Return to{' '}
          <Link href="/statements" className="text-pink-200 hover:text-pink-100">
            Statements
          </Link>{' '}
          or{' '}
          <Link href="/history" className="text-pink-200 hover:text-pink-100">
            Purchase History
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
