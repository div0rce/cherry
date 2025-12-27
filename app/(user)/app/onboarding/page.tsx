import type { JSX } from 'react';
import Link from 'next/link';
import { fetchFromApi, requireUserContext } from '../../_lib/api';
import type { AutopilotOnboardingState, AutopilotPrereqs } from '../../../../lib/autopilot/prereq-types';
import { loadDemoDataset } from './actions';
import { DemoDatasetButton } from './_components/DemoDatasetButton';
export const dynamic = 'force-dynamic';

type MissingKey = 'cards' | 'rules' | 'buckets' | null;

type OnboardingSearchParams = {
  missing?: string | string[] | undefined;
};

function toMissingKey(raw: string | string[] | undefined): MissingKey {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === 'cards' || value === 'rules' || value === 'buckets') return value;
  return null;
}

function statusTone(state: AutopilotOnboardingState, step: MissingKey | 'ready'): {
  label: string;
  color: string;
  pill: string;
} {
  const complete =
    (step === 'cards' && state !== 'EMPTY') ||
    (step === 'rules' && (state === 'NEED_BUCKETS' || state === 'READY')) ||
    (step === 'buckets' && state === 'READY') ||
    (step === 'ready' && state === 'READY');

  return {
    label: complete ? 'Ready' : 'Missing',
    color: complete ? 'text-emerald-700 bg-emerald-100' : 'text-amber-700 bg-amber-100',
    pill: complete ? 'Ready' : 'Needed',
  };
}

function buildPrimaryCta(prereqs: AutopilotPrereqs, missing: MissingKey): { href: string; label: string } {
  if (missing === 'cards') {
    return { href: '/app/onboarding/cards/new', label: 'Add your first card' };
  }
  if (missing === 'rules') {
    const firstCardId = prereqs.cards[0]?.id;
    const hasFirstCardId = typeof firstCardId === 'string' && firstCardId.length > 0;
    const href = hasFirstCardId
      ? `/app/onboarding/cards/${firstCardId}/rules/new`
      : '/app/onboarding/cards/new';
    return { href, label: 'Add a reward rule' };
  }
  if (missing === 'buckets') {
    return { href: '/app/onboarding/buckets/new', label: 'Create a bucket' };
  }
  return { href: '/app/autopilot', label: 'Open Autopilot preview' };
}

function Warnings({ warnings }: { warnings: string[] }): JSX.Element | null {
  if (warnings.length === 0) return null;
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <p className="text-sm font-semibold text-amber-800">Non-blocking warnings</p>
      <ul className="mt-2 space-y-1 text-sm text-amber-900">
        {warnings.map((warning) => (
          <li key={warning} className="flex gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
            <span>{warning}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StepList({
  prereqs,
  highlightedMissing,
}: {
  prereqs: AutopilotPrereqs;
  highlightedMissing: MissingKey;
}): JSX.Element {
  const steps: Array<{ key: MissingKey | 'ready'; title: string; helper: string }> = [
    { key: 'cards', title: 'Add a card', helper: 'At least one active card' },
    { key: 'rules', title: 'Add a reward rule', helper: 'Map at least one rule to a card' },
    { key: 'buckets', title: 'Create a bucket', helper: 'Budget to evaluate constraints' },
    { key: 'ready', title: 'Preview ready', helper: 'Run Autopilot preview' },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-[#0f172a]">Onboarding steps</h2>
      <p className="text-sm text-slate-600">Autopilot enforces only the hard prerequisites.</p>
      <ul className="mt-4 space-y-3">
        {steps.map((step, index) => {
          const tone = statusTone(prereqs.state, step.key);
          const isActive = highlightedMissing === step.key || (highlightedMissing === null && step.key === 'ready');
          return (
            <li
              key={step.key}
              className={`flex items-start gap-4 rounded-xl border px-3 py-3 ${
                isActive ? 'border-[#ff4d6d]/40 bg-[#ff4d6d]/5' : 'border-slate-200 bg-slate-50'
              }`}
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-[#ff4d6d] shadow-sm"
                aria-hidden
              >
                {index + 1}
              </div>
              <div className="flex flex-1 items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-[#0f172a]">{step.title}</p>
                  <p className="text-sm text-slate-600">{step.helper}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone.color}`}>
                  {tone.pill}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function CardsPanel({ prereqs }: { prereqs: AutopilotPrereqs }): JSX.Element {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#0f172a]">Cards & reward rules</h2>
          <p className="text-sm text-slate-600">At least one card and one rule are required.</p>
        </div>
        <Link href="/app/onboarding/cards/new" className="text-sm font-semibold text-[#ff4d6d]">
          Add card →
        </Link>
      </div>

      {prereqs.cards.length === 0 ? (
        <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-700">
          No cards yet. Add one to unlock reward rules and Autopilot previews.
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {prereqs.cards.map((card) => (
            <li
              key={card.id}
              className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 md:flex-row md:items-center md:justify-between"
            >
              <div className="space-y-1">
                <p className="text-base font-semibold text-[#0f172a]">{card.nickname}</p>
                <p className="text-sm text-slate-600">
                  {card.issuer} · {card.network} · {card.rewardRuleCount} rule
                  {card.rewardRuleCount === 1 ? '' : 's'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                <Link
                  href={`/app/onboarding/cards/${card.id}/edit`}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[#0f172a] hover:border-[#ff4d6d]/40 hover:text-[#ff4d6d]"
                >
                  Edit card
                </Link>
                <Link
                  href={`/app/onboarding/cards/${card.id}/rules/new`}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[#0f172a] hover:border-[#ff4d6d]/40 hover:text-[#ff4d6d]"
                >
                  Add rule
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BucketsPanel({ prereqs }: { prereqs: AutopilotPrereqs }): JSX.Element {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#0f172a]">Buckets</h2>
          <p className="text-sm text-slate-600">Buckets let Autopilot evaluate budget guardrails.</p>
        </div>
        <Link href="/app/onboarding/buckets/new" className="text-sm font-semibold text-[#ff4d6d]">
          Create bucket →
        </Link>
      </div>

      {prereqs.buckets.length === 0 ? (
        <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-700">
          No buckets yet. Add at least one to enable budget constraints.
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {prereqs.buckets.map((bucket) => (
            <li
              key={bucket.id}
              className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 md:flex-row md:items-center md:justify-between"
            >
              <div className="space-y-1">
                <p className="text-base font-semibold text-[#0f172a]">{bucket.name}</p>
                <p className="text-sm text-slate-600">
                  {bucket.category} · {bucket.period.toLowerCase()}
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Link
                  href={`/app/onboarding/buckets/${bucket.id}/edit`}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[#0f172a] hover:border-[#ff4d6d]/40 hover:text-[#ff4d6d]"
                >
                  Edit bucket
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: Promise<OnboardingSearchParams> | OnboardingSearchParams;
}): Promise<JSX.Element> {
  const resolvedSearchParams =
    searchParams instanceof Promise ? await searchParams : (searchParams ?? {});
  const rawMissing = resolvedSearchParams.missing;
  const missingParam = typeof rawMissing === 'string' ? rawMissing : '';
  const highlightedMissing = toMissingKey(missingParam);

  const userContext = await requireUserContext();
  const prereqResponse = await fetchFromApi<{
    prereqs: AutopilotPrereqs;
    missing: 'cards' | 'rules' | 'buckets' | null;
  }>('/api/autopilot/prereqs');
  if (!prereqResponse.ok) {
    throw new Error(prereqResponse.message);
  }
  const prereqPayload = prereqResponse.data;
  const prereqs = prereqPayload.prereqs;
  const missing = prereqPayload.missing;
  const primaryCta = buildPrimaryCta(prereqs, missing);

  const chosenMissing = highlightedMissing !== null ? highlightedMissing : missing;
  const hasMissingKey = chosenMissing !== null;
  const missingLabel = hasMissingKey
    ? ({
        cards: 'cards',
        rules: 'reward rules',
        buckets: 'buckets',
      } as const)[chosenMissing]
    : null;
  const hasMissingLabel = typeof missingLabel === 'string' && missingLabel.length > 0;

  return (
    <main className="min-h-screen bg-linear-to-b from-[#f8fafc] to-[#e2e8f0]">
      <div className="mx-auto max-w-6xl px-4 py-10 space-y-8">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#ff4d6d]">
            Cherry Autopilot
          </p>
          <h1 className="text-3xl font-semibold text-[#0f172a]">Onboarding hub</h1>
          <p className="max-w-3xl text-sm text-slate-600">
            Autopilot is advisory-only and needs a minimal dataset. Add a card, at least one reward
            rule, and one bucket. Everything else is optional and shown as warnings, not blockers.
          </p>
        </header>

        {hasMissingLabel ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Autopilot can’t run yet. Add {missingLabel} to continue.
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            You’re ready to preview Autopilot. Run a simulation to move into commit flow.
          </div>
        )}

        <section className="grid gap-6 lg:grid-cols-[1.25fr_0.85fr]">
          <div className="space-y-4">
            <StepList prereqs={prereqs} highlightedMissing={highlightedMissing} />
            <CardsPanel prereqs={prereqs} />
            <BucketsPanel prereqs={prereqs} />
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-[#0f172a]">Next action</h2>
              <p className="text-sm text-slate-600">
                We gate Autopilot until the blocking prerequisites are satisfied.
              </p>
              <div className="mt-4 flex flex-col gap-3">
                <Link
                  href={primaryCta.href}
                  className="inline-flex items-center justify-center rounded-lg bg-[#0f172a] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#111827]"
                >
                  {primaryCta.label}
                </Link>
                {userContext.mode === 'LAB_DEMO' && missing !== null ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-sm font-semibold text-[#0f172a]">Need a fast start?</p>
                    <p className="text-sm text-slate-600">
                      Load a small lab dataset (cards, rules, buckets). Idempotent while you stay in this
                      session.
                    </p>
                    <div className="mt-2">
                      <DemoDatasetButton action={loadDemoDataset} />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <Warnings warnings={prereqs.warnings} />
          </div>
        </section>
      </div>
    </main>
  );
}
