import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import Link from 'next/link';

export default async function StatementsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect(`/signin?callbackUrl=${encodeURIComponent('/statements')}`);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-label text-pink-200">Statements</p>
        <h1 className="text-3xl font-semibold text-white">Statements</h1>
        <p className="text-slate-300">
          Statement grouping isn&apos;t implemented yet; use Purchase History for now.
        </p>
      </header>

      <div className="rounded-2xl border border-white/5 bg-white/5 p-4 shadow-lg">
        <p className="text-sm text-slate-300">
          Placeholder: statements view coming soon. In the meantime, browse{' '}
          <Link href="/history" className="text-pink-200 hover:text-pink-100">
            Purchase History
          </Link>{' '}
          for all transactions.
        </p>
      </div>
    </div>
  );
}
