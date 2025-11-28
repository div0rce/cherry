import type { JSX } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUserId } from '@/lib/auth';
import { AddBucketForm } from '../client';

export default async function NewBucketPage(): Promise<JSX.Element | null> {
  try {
    await getCurrentUserId();
  } catch {
    redirect(`/signin?callbackUrl=${encodeURIComponent('/buckets/new')}`);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-label text-pink-200">Buckets</p>
        <h1 className="text-3xl font-semibold text-white">New Bucket</h1>
        <p className="text-slate-300">Define a budget with period, amount, and strict mode.</p>
      </header>

      <div className="rounded-2xl border border-white/5 bg-white/5 p-4 shadow-lg">
        <AddBucketForm />
      </div>
    </div>
  );
}
