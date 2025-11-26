import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { AddBucketForm } from '../client';

export default async function NewBucketPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent('/buckets/new')}`);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-[0.2em] text-pink-200">Buckets</p>
        <h1 className="text-3xl font-semibold text-white">New Bucket</h1>
        <p className="text-slate-300">Define a budget with period, amount, and strict mode.</p>
      </header>

      <div className="rounded-2xl border border-white/5 bg-white/5 p-4 shadow-lg">
        <AddBucketForm />
      </div>
    </div>
  );
}
