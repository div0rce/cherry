import type { JSX } from 'react';
import Link from 'next/link';
import { requireUserContext } from '../../../../_lib/api';
import { CardForm } from '../../_components/CardForm';
import { createCard } from './actions';
export const dynamic = 'force-dynamic';



export default async function NewCardPage(): Promise<JSX.Element> {
  await requireUserContext();

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#f8fafc] to-[#e2e8f0]">
      <div className="mx-auto max-w-3xl px-4 py-10 space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#ff4d6d]">Cards</p>
            <h1 className="text-2xl font-semibold text-[#0f172a]">Add a card</h1>
            <p className="text-sm text-slate-600">
              Autopilot needs at least one active card. Defaults assume the card is active; you can edit it later.
            </p>
          </div>
          <Link href="/app/onboarding" className="text-sm font-semibold text-[#ff4d6d]">
            ← Back to onboarding
          </Link>
        </div>

        <CardForm action={createCard} submitLabel="Save card" />
      </div>
    </main>
  );
}
