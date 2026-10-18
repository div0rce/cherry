import type { JSX } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '../lib/auth.js';
import { ROUTES } from '../lib/routes.js';

// Public landing page. Every claim here matches what the product does today (docs/legal-constraints.md
// overrides marketing copy): advisory only, no money movement, no account connection, user-entered
// cards. Signed-in visitors go straight to the app.
export default async function LandingPage(): Promise<JSX.Element> {
  const session = await auth();
  if (session?.user !== undefined) redirect(ROUTES.user.app);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
        <span className="text-lg font-bold">Cherry</span>
        <Link href={'/signin'} className="text-sm font-semibold text-[#A01029] hover:underline">
          Sign in
        </Link>
      </header>

      <main id="main">
        <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#A01029]">Spending copilot</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-semibold leading-tight sm:text-5xl">
            Know which card to use before you buy.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-slate-600">
            Tell Cherry what you are about to spend. It compares the cards and spending limits you have
            set up and recommends one. You pay the way you always do; Cherry never moves money.
          </p>
          <Link
            href={'/signin'}
            className="mt-8 inline-flex rounded-full bg-[#C21733] px-6 py-3 text-sm font-semibold text-white hover:bg-[#A01029]"
          >
            Get started
          </Link>
          <p className="mt-3 text-xs text-slate-500">No card numbers, no bank logins.</p>
        </section>

        <section aria-labelledby="how" className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
            <h2 id="how" className="text-2xl font-semibold">How it works</h2>
            <ol className="mt-8 grid gap-6 sm:grid-cols-3">
              <li className="rounded-2xl border border-slate-200 p-5">
                <p className="text-sm font-semibold text-[#A01029]">1. Add your cards</p>
                <p className="mt-2 text-sm text-slate-600">
                  A nickname, issuer, and network for each card, plus the rewards it earns (for example
                  3x on dining).
                </p>
              </li>
              <li className="rounded-2xl border border-slate-200 p-5">
                <p className="text-sm font-semibold text-[#A01029]">2. Set spending buckets</p>
                <p className="mt-2 text-sm text-slate-600">
                  Weekly or monthly limits by category, like $300 a month for dining.
                </p>
              </li>
              <li className="rounded-2xl border border-slate-200 p-5">
                <p className="text-sm font-semibold text-[#A01029]">3. Plan a purchase</p>
                <p className="mt-2 text-sm text-slate-600">
                  Enter the amount and merchant. Cherry recommends a card, explains why, and shows how
                  the purchase affects your bucket.
                </p>
              </li>
            </ol>
          </div>
        </section>

        <section aria-labelledby="limits" className="border-t border-slate-200">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
            <h2 id="limits" className="text-2xl font-semibold">What Cherry does not do</h2>
            <ul className="mt-6 space-y-3 text-sm text-slate-700">
              <li>It is not a card and does not process, approve, or move any payment.</li>
              <li>It does not connect to your bank or card accounts. You enter your cards and rules yourself, so recommendations are only as accurate as those rules.</li>
              <li>It never asks for card numbers, security codes, PINs, or bank credentials.</li>
              <li>Recommendations are advice. Ignoring one has no consequence, and when Cherry lacks enough information to judge an option safely, it leaves that option out.</li>
            </ul>
          </div>
        </section>

        <section className="border-t border-slate-200 bg-white">
          <div className="mx-auto flex max-w-5xl flex-col items-start gap-4 px-4 py-16 sm:px-6">
            <h2 className="text-2xl font-semibold">Make your next purchase an informed one.</h2>
            <Link
              href={'/signin'}
              className="inline-flex rounded-full bg-[#C21733] px-6 py-3 text-sm font-semibold text-white hover:bg-[#A01029]"
            >
              Get started
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200">
        <div className="mx-auto max-w-5xl px-4 py-8 text-xs text-slate-500 sm:px-6">
          Cherry is a spending copilot, not a card issuer, bank, or payment processor.
        </div>
      </footer>
    </div>
  );
}
