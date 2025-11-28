import type { JSX } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUserId } from '@/lib/auth';
import { AddCardForm } from '../client';

export default async function NewCardPage(): Promise<JSX.Element | null> {
  try {
    await getCurrentUserId();
  } catch {
    redirect(`/signin?callbackUrl=${encodeURIComponent('/cards/new')}`);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-label text-pink-200">Cards</p>
        <h1 className="text-3xl font-semibold text-white">New Card</h1>
        <p className="text-slate-300">Create a card; add reward rules after saving.</p>
      </header>

      <div className="rounded-2xl border border-white/5 bg-white/5 p-4 shadow-lg">
        <AddCardForm />
      </div>
    </div>
  );
}
