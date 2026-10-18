import type { JSX } from 'react';
import Link from 'next/link';

export type HomeSetup = 'ready' | 'needs-setup' | 'unknown';

// Home shows no invented activity (docs/home-ui-contract.md). It tells a new or partly set-up user
// what is missing and where to finish, and sends a ready user to the one primary action.
export function HomeScreen({ setup }: { setup: HomeSetup }): JSX.Element {
  return (
    <div className="mx-auto max-w-4xl pb-20">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/90 px-5 py-4 shadow-sm backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0F172A] text-base font-bold text-white shadow-sm" aria-hidden>
            C
          </div>
          <div>
            <p className="text-sm font-semibold text-[#0F172A]">Cherry</p>
            <p className="text-xs text-slate-600">Money, in context.</p>
          </div>
        </div>
      </header>

      {setup === 'needs-setup' ? (
        <section className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-[#0F172A]">Finish setting up Cherry</h1>
          <p className="mt-2 text-sm text-slate-700">
            Cherry needs at least one card, one reward rule for it, and one spending bucket before it
            can recommend anything. Your progress is saved, so you can pick up where you left off.
          </p>
          <Link
            href="/app/onboarding"
            className="mt-5 inline-flex items-center rounded-full bg-[#0F172A] px-4 py-2 text-sm font-medium text-white"
          >
            Continue setup
          </Link>
        </section>
      ) : (
        <section className="mt-8 rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-[#0F172A]">
            {setup === 'ready' ? 'Ready when you are' : 'Welcome to Cherry'}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Before a purchase, tell Cherry the amount and merchant. It compares your cards and
            buckets and recommends one. It never moves money; you pay as usual.
          </p>
          {setup === 'unknown' ? (
            <p role="status" className="mt-2 text-sm text-amber-800">
              We couldn&apos;t check your setup just now. If planning fails, review{' '}
              <Link href="/app/onboarding" className="font-semibold underline">your cards and buckets</Link>.
            </p>
          ) : null}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/app/autopilot"
              className="inline-flex items-center rounded-full bg-[#0F172A] px-4 py-2 text-sm font-medium text-white"
            >
              Plan a purchase
            </Link>
            <Link href="/app/onboarding" className="inline-flex items-center px-2 py-2 text-sm font-medium text-[#A01029]">
              Manage cards and buckets
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
