import React, { type JSX } from 'react';
import { Button, ButtonLink } from '../ui/Button.js';
import { AutopilotMonthImpactBar } from './AutopilotMonthImpactBar.js';
import type { AutopilotPurchaseSummary } from './AutopilotShell';
import type { AutopilotSimulationResult } from '../../lib/autopilot/runSimulation';
import { formatCurrency } from '../../lib/formatCurrency.js';
import type { AutopilotUiSpec } from '../../lib/autopilot/uiSpec';

void React;

type AutopilotDecisionPanelProps = {
  hasPurchase: boolean;
  purchaseSummary: AutopilotPurchaseSummary | null;
  simulationResult: AutopilotSimulationResult | null;
  isSimulating: boolean;
  simulationError: string | null;
  uiSpec: AutopilotUiSpec;
};

function hasText(value?: string | null): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function ReasonBlock({ title, body }: { title: string; body: string }): JSX.Element {
  return (
    <div className="h-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
      <p className="text-xs font-semibold text-[#0F172A]">{title}</p>
      <p className="mt-1 text-sm text-slate-600">{body}</p>
    </div>
  );
}

export function AutopilotDecisionPanel({
  hasPurchase,
  purchaseSummary,
  simulationResult,
  isSimulating,
  simulationError,
  uiSpec,
}: AutopilotDecisionPanelProps): JSX.Element {
  const panelCopy = { ...uiSpec.panel, ...(simulationResult?.ui ?? {}) };

  if (!hasPurchase || purchaseSummary === null) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-[11px] uppercase tracking-[0.18em] text-[#94A3B8]">
          {panelCopy.idleTitle}
        </div>
        <p className="mt-2 text-sm text-slate-600">{panelCopy.idleBody}</p>
      </div>
    );
  }

  if (!simulationResult) {
    return (
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-[#94A3B8]">
              {panelCopy.loadingTitle}
            </div>
            <p className="mt-1 text-sm text-slate-600">
              {isSimulating ? panelCopy.loadingBody : simulationError ?? panelCopy.errorBody}
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {panelCopy.sectionSimulationEyebrow}
          </span>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-4">
          <div className="h-3 w-3/4 animate-pulse rounded bg-slate-200" />
          <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-slate-200" />
          <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-slate-200" />
        </div>
      </div>
    );
  }

  const { merchant, amount } = purchaseSummary;
  const recommendedChoice = simulationResult.cards[0] ?? null;
  const alternativeChoice = simulationResult.cards[1] ?? null;
  const rewardReason = simulationResult.recommendationSummary;
  const budgetReason = simulationResult.monthImpactSummary;
  const riskReason = simulationResult.riskBanner ?? simulationResult.monthImpact.riskNote ?? '';
  const hasSimulationResult = simulationResult !== null;
  const contextLabel =
    simulationResult.contextLabel ?? panelCopy.sectionSimulationEyebrow;
  const reasonLabels = simulationResult.reasonLabels ?? {
    rewards: simulationResult.recommendationSectionLabel,
    budget: simulationResult.monthImpactTitle,
    risk: panelCopy.simulationIssueTitle,
  };

  return (
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="text-[11px] uppercase tracking-[0.18em] text-[#94A3B8]">
              {uiSpec.resultTitle}
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-[#0F172A]">
              {formatCurrency(amount)} · {simulationResult.categoryLabel}
            </div>
            <p className="text-sm text-slate-600">{contextLabel}</p>
          </div>
          <div
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold ${simulationResult.safetyBadgeClass}`}
          >
            <span className={simulationResult.safetyBadgeDotClass} aria-hidden />
            {simulationResult.safetyBadgeLabel}
          </div>
        </div>
        {simulationResult.state === 'warning' && hasText(simulationResult.riskBanner) ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
            {simulationResult.riskBanner}
          </div>
        ) : null}
      </div>

      {isSimulating ? (
        <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-4">
          <div className="h-3 w-3/4 animate-pulse rounded bg-slate-200" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200" />
        </div>
      ) : null}

      <div className="space-y-4">
        {recommendedChoice ? (
          <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-4">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>{simulationResult.recommendationSectionLabel}</span>
              <span>{simulationResult.rewardStrengthLabel}</span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="text-sm font-semibold text-[#0F172A]">{recommendedChoice.name}</div>
                <p className="text-sm text-slate-600">
                  {merchant !== '' ? merchant : panelCopy.unnamedMerchantFallback}
                </p>
                <p className="text-[12px] text-slate-600">{recommendedChoice.sentence}</p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                  recommendedChoice.labelTone === 'positive'
                    ? 'bg-emerald-50 text-emerald-700'
                    : recommendedChoice.labelTone === 'negative'
                      ? 'bg-rose-50 text-rose-700'
                      : 'bg-slate-100 text-slate-700'
                }`}
              >
                {recommendedChoice.label}
              </span>
            </div>
          </div>
        ) : null}

        <div className="grid gap-3 lg:grid-cols-3" id="autopilot-reasons">
          {hasText(rewardReason) ? (
            <ReasonBlock title={reasonLabels.rewards} body={rewardReason} />
          ) : null}
          {hasText(budgetReason) ? (
            <ReasonBlock title={reasonLabels.budget} body={budgetReason} />
          ) : null}
          {hasText(riskReason) ? <ReasonBlock title={reasonLabels.risk} body={riskReason} /> : null}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>{simulationResult.monthImpactTitle}</span>
            <span>{simulationResult.rewardStrengthLabel}</span>
          </div>
          <AutopilotMonthImpactBar segments={simulationResult.impactSegments} />
          <div className="space-y-1">
            {simulationResult.impactNotes.map((note) => (
              <p key={note} className="text-[11px] text-slate-600">
                {note}
              </p>
            ))}
          </div>
        </div>

        {alternativeChoice ? (
          <div className="rounded-xl border border-slate-100 bg-white px-4 py-3">
            <div className="text-xs font-semibold text-[#0F172A]">
              {simulationResult.alternativeSectionLabel}
            </div>
            <div className="mt-2 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#0F172A]">{alternativeChoice.name}</p>
                <p className="text-[12px] text-slate-600">{alternativeChoice.sentence}</p>
              </div>
              <span className="text-[11px] font-semibold text-slate-500">{alternativeChoice.label}</span>
            </div>
          </div>
        ) : null}
      </div>

      {hasText(simulationError) ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <div className="text-[11px] uppercase tracking-[0.14em]">
            {panelCopy.simulationIssueTitle}
          </div>
          <p>{simulationError}</p>
          {hasSimulationResult ? (
            <p className="text-[11px] text-amber-700">{panelCopy.showingPreviousResultNote}</p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button size="lg">{simulationResult.ctaPrimary ?? 'Use this card'}</Button>
        <Button variant="secondary" size="lg">
          {simulationResult.ctaSecondary ?? 'See alternatives'}
        </Button>
        <ButtonLink href="#autopilot-reasons" variant="ghost" size="sm">
          Why?
        </ButtonLink>
      </div>
      <p className="text-[11px] text-slate-500">{panelCopy.actionComingSoonNote}</p>
    </div>
  );
}
