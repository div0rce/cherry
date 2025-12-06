import type { JSX } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { RecommendationMock } from './_components/recommendation-mock';

export const metadata: Metadata = {
  title: 'Cherry | Recover lost rewards in seconds',
  description:
    'Cherry is a real-time spending copilot that recovers lost rewards in ~20s. Preview a recommendation before signing in.',
};

const testimonials = [
  {
    quote: 'Cherry slotted into my travel cards and matched my gut in under a minute. I just follow the prompts now.',
    name: 'Priya',
    role: 'Engineer @ Segment',
    stat: '+14% points on travel weeks',
    badge: 'Segment',
  },
  {
    quote: 'It caught a $28 grocery leak on day one and nudged me to claim Cherry Points right after.',
    name: 'Luis',
    role: 'Frequent traveler',
    stat: '$28 leak stopped week one',
    badge: 'Mileage Forum',
  },
  {
    quote: 'I wanted a quick dopamine hit. The 20s demo plus +150 pts after my first swipe made it sticky.',
    name: 'Maya',
    role: 'Student',
    stat: '+150 Cherry Points after first swipe',
    badge: 'Campus Finance Club',
  },
];

const whyItems = [
  {
    title: 'Autopilot intelligence',
    body: 'Observe → Evaluate → Recommend → Reward. Advisory only; Cherry never fronts or processes payments.',
    icon: '⚡️',
  },
  {
    title: 'Reward confidence',
    body: 'See projected gains and Cherry Points before acting, so you trust each nudge.',
    icon: '🎯',
  },
  {
    title: 'Context, not hardware',
    body: 'Cherry Vine is a context beacon—no tap/swipe terminals or new cards needed.',
    icon: '🛰️',
  },
];

const howSteps = [
  {
    step: '01',
    title: 'Connect cards (<60s)',
    body: 'Add the cards you actually use. Cherry observes; it does not process payments.',
  },
  {
    step: '02',
    title: 'See a recommendation (~20s)',
    body: 'We score your next purchase instantly and surface the best card and perk.',
  },
  {
    step: '03',
    title: 'Claim rewards + Cherry Points',
    body: 'Follow the prompt, confirm, and earn your first Cherry Points streak.',
  },
];

const heroProof = [
  { label: '20s to see a live recommendation', icon: '⚡️' },
  { label: 'Auto-optimizes the cards you already carry', icon: '💼' },
  { label: 'Advisory only — we never route payments', icon: '🛡️' },
];

const trustBand = [
  { label: 'Power travelers', sub: '+18% perk capture (beta)', emoji: '✈️' },
  { label: 'Engineers & operators', sub: '4.8/5 satisfaction', emoji: '🛠️' },
  { label: 'Students & creators', sub: '$23/week leak stopped', emoji: '📈' },
];

const momentumStats = [
  {
    value: '$37/wk',
    label: 'Rewards recovered (self-reported)',
    detail: '2–3 cards connected; advisory decisions only.',
  },
  {
    value: '20s',
    label: 'Time to first recommendation',
    detail: 'Zero bank changes; follow the prompt.',
  },
  {
    value: '4,218',
    label: 'Recommendations shipped this week',
    detail: 'Each stored as advisory sessions, never payment processing.',
  },
  {
    value: '+150 pts',
    label: 'Immediate reward loop',
    detail: 'Claim Cherry Points after your first swipe and confirmation.',
  },
];

const primaryCtaHref = '/signin';
const demoCtaHref = '#fast-proof';
const primaryCtaClasses =
  'inline-flex items-center justify-center rounded-full bg-[#D1193A] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#D1193A]/20 transition hover:bg-[#b51633] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D1193A]';
const secondaryCtaClasses =
  'inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900';

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
          <nav className="flex items-center gap-3 text-sm text-slate-600">
            <Link href={demoCtaHref} className="hidden sm:inline-flex hover:text-slate-900">
              See demo
            </Link>
            <Link href="/signin" className="hover:text-slate-900">
              Sign in
            </Link>
            <Link href={primaryCtaHref} className="hidden md:inline-flex text-slate-900">
              <span className={primaryCtaClasses}>Start free</span>
            </Link>
          </nav>
        </header>

        {/* Hero */}
        <section className="grid grid-cols-1 gap-12 md:grid-cols-2 md:items-center">
          {/* Left: copy */}
          <div className="space-y-7">
            <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-slate-900 via-[#D1193A] to-slate-900 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white shadow-md shadow-[#D1193A]/20">
              Leak-stopper mode
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              <span className="text-[#0EEA9B]">20s to proof</span>
            </div>

            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Recover $37/week in ~20 seconds.
            </h1>
            <p className="max-w-xl text-lg text-slate-600">
              Cherry is a real-time spending copilot. It observes, evaluates, recommends, and rewards
              without touching payment rails. See your first recommendation before you sign in.
            </p>

            <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-800">
              {heroProof.map((point) => (
                <span
                  key={point.label}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 shadow-sm"
                >
                  <span>{point.icon}</span>
                  <span className="text-slate-700">{point.label}</span>
                </span>
              ))}
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <Link href={primaryCtaHref} className={primaryCtaClasses}>
                  Start free
                </Link>
                <Link href={demoCtaHref} className={secondaryCtaClasses}>
                  See the 20s demo
                </Link>
                <span className="inline-flex items-center gap-2 text-xs text-slate-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#0EA463]" />
                  Advisory only; Cherry never routes payments.
                </span>
              </div>
              <div className="grid gap-3 text-xs text-slate-600 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Fast payoff
                  </p>
                  <p className="text-base font-semibold text-slate-900">$37/week recovered</p>
                  <p className="text-[11px] text-slate-500">Self-reported average with 2–3 cards.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Reward loop
                  </p>
                  <p className="text-base font-semibold text-slate-900">+150 Cherry Points</p>
                  <p className="text-[11px] text-slate-500">Claim after your first swipe + confirmation.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: mock / animation */}
          <div className="flex justify-center md:justify-end">
            <div className="relative w-full max-w-md">
              <div className="absolute -top-6 right-2 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-white shadow-lg shadow-slate-900/30">
                <span className="h-2 w-2 rounded-full bg-[#0EA463] ring-2 ring-white" />
                4,218 recommendations shipped this week
              </div>
              <RecommendationMock />
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-[#D1193A]" />
                See your first one in ~20s
              </div>
            </div>
          </div>
        </section>

        {/* Fast proof / demo anchor */}
        <section id="fast-proof" className="mt-10">
          <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 shadow-xl ring-1 ring-slate-800/60">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-200">
                  Fast proof, no account wall
                </p>
                <p className="text-lg font-semibold text-white">
                  Watch how Cherry chooses a card in 20 seconds, then decide if you want to sign in.
                </p>
              </div>
              <Link
                href={primaryCtaHref}
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Start free
                <span aria-hidden>→</span>
              </Link>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {momentumStats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 shadow-sm backdrop-blur"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">
                    {stat.label}
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-white">{stat.value}</p>
                  <p className="text-xs text-slate-200/80">{stat.detail}</p>
                </div>
              ))}
            </div>
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
      <section className="border-y border-[#D1193A]/40 bg-gradient-to-r from-slate-900 via-[#D1193A] to-slate-900 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-white/80">Leak alert</p>
              <p className="text-lg font-semibold">
                You&apos;re leaking $200–$800/year. Cherry plugs it with one recommendation per purchase.
              </p>
              <p className="text-xs text-white/80">No new cards. Advisory only. Stop the leak now.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-sm">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[#0EEA9B]" />
                Live counter ticking
              </div>
              <Link
                href={primaryCtaHref}
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Stop my leak
                <span aria-hidden>→</span>
              </Link>
            </div>
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
                Outcome-backed stories, not vague praise. Advisory recommendations only; you stay in control.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-[11px] text-slate-500">
              {trustBand.map((item) => (
                <span
                  key={item.label}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 font-medium shadow-sm"
                >
                  <span>{item.emoji}</span>
                  <span className="text-slate-700">{item.label}</span>
                  <span className="text-slate-400">· {item.sub}</span>
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
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                    {testimonial.badge}
                  </span>
                  <span className="text-[11px] font-semibold text-[#0EA463]">{testimonial.stat}</span>
                </div>
                <p className="mt-3 text-sm text-slate-900">“{testimonial.quote}”</p>
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
