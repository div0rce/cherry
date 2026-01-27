import Link from 'next/link';
import type { JSX } from 'react';
import { ButtonLink } from '../../../../components/ui/Button.js';
import type { HomeUiBundle, MonthStateBadgeTone } from '../../../../lib/home/ui-bundle.js';

type HomeScreenProps = {
  bundle: HomeUiBundle;
};

type Severity = 'info' | 'caution' | 'risk';

const severityDotClass: Record<Severity, string> = {
  info: 'bg-slate-400',
  caution: 'bg-amber-500',
  risk: 'bg-orange-500',
};

const badgeToneClass: Record<MonthStateBadgeTone, string> = {
  stable: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  tight: 'border-amber-200 bg-amber-50 text-amber-800',
  risky: 'border-orange-200 bg-orange-50 text-orange-800',
};

function ModeBadge({
  label,
  detail,
  simulationLabel,
  simulationDetail,
}: HomeUiBundle['mode']): JSX.Element {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-700">
      <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-[#0F172A] shadow-sm">
        <span className="h-2 w-2 rounded-full bg-[#C21733]" aria-hidden />
        {label}
      </span>
      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-700">
        {simulationLabel}
      </span>
      <span className="text-[11px] text-slate-500">{detail}</span>
      <span className="text-[11px] text-slate-500">{simulationDetail}</span>
    </div>
  );
}

function MonthBadge({ label, tone }: { label: string; tone: MonthStateBadgeTone }): JSX.Element {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${badgeToneClass[tone]}`}
    >
      <span className="h-2 w-2 rounded-full bg-current opacity-70" aria-hidden />
      {label}
    </span>
  );
}

function SectionCard({
  title,
  helper,
  footer,
  children,
}: {
  title: string;
  helper?: string;
  footer?: JSX.Element;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[#0F172A]">{title}</h2>
          {hasText(helper) ? <p className="text-sm text-slate-600">{helper}</p> : null}
        </div>
        {footer}
      </div>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function hasText(value?: string | null): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function ProgressBar({ percent }: { percent: number }): JSX.Element {
  const clamped = Math.max(0, Math.min(100, Number(percent.toFixed(1))));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full bg-[#C21733]/80"
        style={{ width: `${clamped}%` }}
        aria-label={`${clamped}% used`}
      />
    </div>
  );
}

function HeadsUpItem({
  title,
  detail,
  severity,
}: {
  title: string;
  detail: string;
  severity: Severity;
}): JSX.Element {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
      <span className={`mt-1 h-2.5 w-2.5 rounded-full ${severityDotClass[severity]}`} aria-hidden />
      <div className="space-y-1">
        <p className="text-sm font-semibold text-[#0F172A]">{title}</p>
        <p className="text-sm text-slate-600">{detail}</p>
      </div>
    </div>
  );
}

export function HomeScreen({ bundle }: HomeScreenProps): JSX.Element {
  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-20">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/90 px-5 py-4 shadow-sm backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0F172A] text-base font-bold text-white shadow-sm">
            C
          </div>
          <div>
            <p className="text-sm font-semibold text-[#0F172A]">Cherry</p>
            <p className="text-xs text-slate-600">Money, in context.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ModeBadge {...bundle.mode} />
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-semibold text-[#0F172A] shadow-sm">
            •
          </span>
        </div>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold text-[#0F172A]">{bundle.monthState.title}</h1>
              <MonthBadge label={bundle.monthState.badge.label} tone={bundle.monthState.badge.tone} />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              {bundle.plan.name}
            </p>
            <p className="text-sm text-slate-600">{bundle.plan.detail}</p>
          </div>
          <ButtonLink href={bundle.monthState.cta.href} variant="secondary" size="sm">
            {bundle.monthState.cta.label}
          </ButtonLink>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
            {bundle.monthState.primaryMetric.label}
          </div>
          <div className="text-3xl font-semibold text-[#0F172A]">
            {bundle.monthState.primaryMetric.value}
          </div>
          <p className="text-sm text-slate-600">{bundle.monthState.primaryMetric.helper}</p>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-sm text-slate-700">
            <span>{bundle.monthState.bufferBar.label}</span>
            <span className="font-semibold text-[#0F172A]">{bundle.monthState.bufferBar.remainingLabel}</span>
          </div>
          <ProgressBar percent={bundle.monthState.bufferBar.usedPercent} />
          <p className="text-sm text-slate-600">{bundle.monthState.explanation}</p>
          <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
            {bundle.monthState.planDefinition}
          </p>
        </div>
      </section>

      <div>
        <ButtonLink href="/app/autopilot" variant="primary" size="lg" className="w-full justify-center">
          Plan a purchase
        </ButtonLink>
        <p className="mt-2 text-sm text-slate-600">
          Plan a purchase runs a simulation. Cherry stays advisory; you choose and pay in your banking app.
        </p>
      </div>

      <div className="space-y-6">
        <SectionCard
          title="Heads up"
          helper="Read-only advisories (max 3)"
          footer={
            <span className="text-xs font-semibold text-slate-500">Neutral styling; advisory only</span>
          }
        >
          {bundle.headsUp.length === 0 ? (
            <p className="text-sm text-slate-600">{bundle.emptyStates.headsUp}</p>
          ) : (
            bundle.headsUp.map((item) => (
              <HeadsUpItem
                key={item.id}
                title={item.title}
                detail={item.detail}
                severity={item.severity}
              />
            ))
          )}
        </SectionCard>

        <SectionCard
          title="Buckets"
          helper="Top 3 buckets"
          footer={
            <Link
              href="/buckets"
              className="text-sm font-semibold text-[#C21733] hover:text-[#A01029]"
            >
              See all buckets →
            </Link>
          }
        >
          {bundle.bucketPreview.length === 0 ? (
            <p className="text-sm text-slate-600">{bundle.emptyStates.bucketPreview}</p>
          ) : (
            <ul className="space-y-3">
              {bundle.bucketPreview.map((bucket) => (
                <li
                  key={bucket.id}
                  className="space-y-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3"
                >
                  <div className="flex items-center justify-between text-sm text-[#0F172A]">
                    <span className="font-semibold">{bucket.name}</span>
                    <span className="text-sm font-semibold text-[#0F172A]">{bucket.remaining}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>{bucket.usedPercent}% used</span>
                  </div>
                  <ProgressBar percent={bucket.usedPercent} />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Upcoming"
          helper="Known obligations"
          footer={
            <Link
              href="/buckets"
              className="text-sm font-semibold text-[#C21733] hover:text-[#A01029]"
            >
              Manage obligations →
            </Link>
          }
        >
          {bundle.upcoming.length === 0 ? (
            <p className="text-sm text-slate-600">{bundle.emptyStates.upcoming}</p>
          ) : (
            <ul className="space-y-2">
              {bundle.upcoming.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 text-sm"
                >
                  <div className="space-y-0.5">
                    <p className="font-semibold text-[#0F172A]">{item.name}</p>
                    <p className="text-slate-600">{item.dateLabel}</p>
                  </div>
                  {hasText(item.amountLabel) ? (
                    <span className="text-sm font-semibold text-[#0F172A]">{item.amountLabel}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Recent"
          helper="Last 3 decision events (simulated until bank data arrives)"
          footer={
            <Link
              href="/history"
              className="text-sm font-semibold text-[#C21733] hover:text-[#A01029]"
            >
              View history →
            </Link>
          }
        >
          {bundle.recent.length === 0 ? (
            <p className="text-sm text-slate-600">{bundle.emptyStates.recent}</p>
          ) : (
            <ul className="space-y-2">
              {bundle.recent.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 text-sm"
                >
                  <div>
                    <p className="font-semibold text-[#0F172A]">{item.title}</p>
                    <p className="text-slate-600">{item.detail}</p>
                  </div>
                  <div className="text-right text-sm text-[#0F172A]">
                    <div className="font-semibold">{item.amountLabel}</div>
                    <div className="text-slate-500">{item.category}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
