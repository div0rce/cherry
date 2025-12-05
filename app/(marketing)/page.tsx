import type { JSX } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { RecommendationMock } from './_components/recommendation-mock';

export const metadata: Metadata = {
  title: 'Cherry | Spend smarter automatically',
  description:
    'Cherry picks the right card for every purchase—instantly, with zero setup. One clear CTA with proof-first framing.',
};

const testimonials = [
  { quote: 'I stopped guessing which card to use.', name: 'Jordan', role: 'Frequent traveler' },
  { quote: 'Cherry saves me money every week.', name: 'Sam', role: 'Engineer' },
  { quote: 'This replaced three apps.', name: 'Alex', role: 'Student' },
];

const whyItems = [
  {
    title: 'Autopilot intelligence',
    body: 'Real-time scoring across your wallets, cards, and habits.',
    icon: '⚡️',
  },
  {
    title: 'Maximized rewards',
    body: 'Never waste 3% cash-back again.',
    icon: '💳',
  },
  {
    title: 'No setup required',
    body: 'Open the app, make a purchase, Cherry handles the math.',
    icon: '🚀',
  },
];

const howSteps = [
  {
    step: '01',
    title: 'Add your cards',
    body: 'Scan or connect the cards you actually use.',
  },
  {
    step: '02',
    title: 'Cherry learns quietly',
    body: 'We build a private, local model of your spending.',
  },
  {
    step: '03',
    title: 'Follow the recommendation',
    body: 'Every purchase, one clear card to use—no thinking.',
  },
];

const proofPoints = [
  'Backed by a real scoring engine',
  'Used by power spenders',
  'Privacy-first architecture',
];

const trustBand = ['Students', 'Engineers', 'Frequent travelers'];

const primaryCtaHref = '/signin';
const primaryCtaClasses =
  'inline-flex items-center justify-center rounded-full bg-[#D1193A] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#D1193A]/20 transition hover:bg-[#b51633] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D1193A]';

export default function MarketingPage(): JSX.Element {
  return (
    <div className="relative min-h-screen bg-white text-slate-900">
      {/* Sticky mobile CTA */}
      <div className="pointer-events-none fixed bottom-4 left-0 right-0 z-30 px-4 md:hidden">
        <div className="pointer-events-auto mx-auto max-w-md rounded-full bg-white shadow-lg shadow-[#D1193A]/15 ring-1 ring-slate-200">
          <Link href={primaryCtaHref} className={`${primaryCtaClasses} w-full justify-center`}>
            Get Started — Free
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
        {/* Top nav */}
        <header className="mb-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#D1193A] text-sm font-semibold text-white shadow-md shadow-[#D1193A]/30">
              C
            </div>
            <span className="text-sm font-semibold tracking-tight text-slate-900">Cherry</span>
          </div>
          <nav className="text-sm text-slate-600">
            <Link href="/signin" className="hover:text-slate-900">
              Sign in
            </Link>
          </nav>
        </header>

        {/* Hero */}
        <section className="grid grid-cols-1 gap-12 md:grid-cols-2 md:items-center">
          {/* Left: copy */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Powered by Cherry&apos;s scoring engine
              <span className="h-1.5 w-1.5 rounded-full bg-[#D1193A]" />
              <span className="text-[#0EA463]">Zero setup</span>
            </div>

            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Spend smarter automatically.
            </h1>
            <p className="max-w-xl text-lg text-slate-600">
              Cherry picks the right card for every purchase—instantly, with zero setup.
            </p>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-slate-500">
              {proofPoints.map((point, idx) => (
                <div key={point} className="flex items-center gap-2">
                  {idx > 0 ? <span className="h-1 w-1 rounded-full bg-slate-300" /> : null}
                  <span>{point}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Link href={primaryCtaHref} className={primaryCtaClasses}>
                Get Started — Free
              </Link>
              <p className="text-xs text-slate-500">
                No credit card required. No bank changes.
              </p>
            </div>
          </div>

          {/* Right: mock / animation */}
          <div className="flex justify-center md:justify-end">
            <RecommendationMock />
          </div>
        </section>
      </div>

      {/* Why Cherry Works */}
      <section className="border-t border-slate-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Why Cherry works
              </p>
              <p className="text-xs text-slate-500">
                Real-time advice that stops reward leakage without extra effort.
              </p>
            </div>
            <div className="hidden text-[11px] font-medium text-slate-500 sm:inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#D1193A]" />
              <span className="h-2 w-2 rounded-full bg-[#0EA463]" />
              <span className="h-2 w-2 rounded-full bg-slate-300" />
            </div>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {whyItems.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                  {item.icon}
                </div>
                <h3 className="mb-1 text-base font-semibold text-slate-900">{item.title}</h3>
                <p className="text-sm text-slate-600">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Loss Aversion Banner */}
      <section className="border-y border-[#FECACA] bg-[#FEF2F2]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
            <p className="text-sm text-slate-800">
              You&apos;re losing $200–$800 yearly by using the wrong card.
            </p>
            <p className="text-sm font-semibold text-slate-900">Cherry closes that gap automatically.</p>
          </div>
        </div>
      </section>

      {/* Social Proof & Testimonials */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Proof it actually helps people
              </h2>
              <p className="max-w-md text-xs text-slate-500">
                Trusted by users who hate leaving rewards on the table.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-[11px] text-slate-500">
              {trustBand.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-slate-200 px-3 py-1 font-medium"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {testimonials.map((testimonial) => (
              <div
                key={testimonial.quote}
                className="flex h-full flex-col justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-5 shadow-sm"
              >
                <p className="text-sm text-slate-900">“{testimonial.quote}”</p>
                <p className="mt-4 text-xs text-slate-500">
                  {testimonial.name} · {testimonial.role}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How Cherry Works */}
      <section id="how-it-works" className="border-t border-slate-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <h2 className="mb-8 text-sm font-semibold uppercase tracking-wide text-slate-500">
            How Cherry works
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            {howSteps.map((step) => (
              <div key={step.step} className="space-y-3">
                <div className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                  <span className="mr-2 text-[9px]">{step.step}</span>
                  <span>Step</span>
                </div>
                <h3 className="text-base font-semibold text-slate-900">{step.title}</h3>
                <p className="text-sm text-slate-600">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final Conversion */}
      <section className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="mx-auto max-w-xl space-y-4 text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Make every purchase the right one.
            </h2>
            <p className="text-sm text-slate-600">
              Start in under a minute. Cherry handles the decisions; you keep the rewards.
            </p>
            <div className="space-y-2">
              <Link href={primaryCtaHref} className={primaryCtaClasses}>
                Start Cherry — Free
              </Link>
              <div>
                <Link
                  href="#how-it-works"
                  className="text-xs text-slate-500 underline-offset-2 hover:underline"
                >
                  Learn how it works
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
