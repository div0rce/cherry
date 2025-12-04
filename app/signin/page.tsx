import type { JSX } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { SignInCard } from './signin-card';

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

const hasText = (value?: string | null): value is string =>
  value !== undefined && value !== null && value !== '';

export default async function SignInPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (session) {
    redirect('/cards');
  }

  const params = (await searchParams) || {};
  const error = typeof params['error'] === 'string' ? params['error'] : undefined;
  const callbackUrl =
    typeof params['callbackUrl'] === 'string' ? params['callbackUrl'] : '/cards';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-10 lg:flex-row lg:items-center lg:gap-12">
        <LeftPanel />
        <div className="mt-10 w-full lg:mt-0 lg:max-w-md">
          <SignInCard
            {...(hasText(error) ? { errorCode: error } : {})}
            callbackUrl={callbackUrl}
          />
        </div>
      </div>
    </div>
  );
}

function LeftPanel() {
  return (
    <div className="w-full rounded-3xl bg-linear-to-br from-pink-600/20 via-slate-900 to-slate-950 p-6 shadow-2xl ring-1 ring-white/10 lg:max-w-xl">
      <div className="space-y-3">
        <div className="text-xs uppercase tracking-label text-pink-200">Cherry</div>
        <h1 className="text-3xl font-semibold text-white">Sign in to your spending copilot</h1>
        <p className="text-slate-300">
          Cherry routes your swipes to the best card, keeps buckets on track, and simulates rewards
          before you pay.
        </p>
      </div>

      <ul className="mt-4 space-y-2 text-sm text-slate-200">
        <li className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-pink-400" />
          Optimize which card to use for every merchant.
        </li>
        <li className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Track budgets by bucket with strict/soft guardrails.
        </li>
        <li className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-blue-400" />
          Simulate rewards and spend before you swipe.
        </li>
      </ul>

      <PseudoDashboard />

      <div className="mt-6 text-sm text-slate-400">
        Need help? <Link href="/simulate" className="text-pink-200 hover:text-pink-100">Open the lab →</Link>
      </div>
    </div>
  );
}

function PseudoDashboard() {
  return (
    <div className="mt-6 space-y-3 rounded-2xl bg-white/5 p-4 shadow-inner ring-1 ring-white/10">
      <div className="relative overflow-hidden rounded-xl bg-linear-to-br from-slate-800 to-slate-900 p-4 ring-1 ring-white/10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-300">Cherry Points</p>
            <p className="text-2xl font-semibold text-white">12,450</p>
          </div>
          <span className="rounded-full bg-pink-500/20 px-3 py-1 text-xs font-semibold text-pink-100">
            Bucket: DINING
          </span>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <div className="h-12 w-20 rounded-lg bg-white/10 backdrop-blur" />
          <div className="space-y-1">
            <div className="h-2 w-24 rounded-full bg-white/20" />
            <div className="h-2 w-16 rounded-full bg-white/10" />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between rounded-lg bg-slate-900/60 px-3 py-2 ring-1 ring-white/5">
          <div>
            <p className="text-sm font-semibold text-white">Chipotle</p>
            <p className="text-xs text-slate-400">DINING · MCC 5812</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-white">$18.75</p>
            <p className="text-[11px] text-emerald-300">Use: Amex Gold (4x)</p>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-slate-900/40 px-3 py-2 ring-1 ring-white/5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <div>
              <p className="text-sm font-semibold text-white">Dining weekly</p>
              <p className="text-[11px] text-slate-400">Remaining $41.25</p>
            </div>
          </div>
          <span className="rounded-full bg-amber-500/20 px-2 py-1 text-[11px] font-semibold text-amber-100">
            Strict
          </span>
        </div>
      </div>
    </div>
  );
}
