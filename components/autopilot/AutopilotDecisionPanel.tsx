import React, { type JSX } from 'react';
import { ButtonLink } from '../ui/Button.js';
import { AutopilotMonthImpactBar } from './AutopilotMonthImpactBar.js';
import type { AutopilotPurchaseSummary } from './AutopilotShell.js';
import type { AutopilotSimulationResult } from '../../lib/autopilot/runSimulation.js';
import { formatCurrency } from '../../lib/formatCurrency.js';
import type { AutopilotUiSpec } from '../../lib/autopilot/uiSpec.js';

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

type PanelCopy = AutopilotUiSpec['panel'] & Partial<NonNullable<AutopilotSimulationResult['ui']>>;
type Card = AutopilotSimulationResult['cards'][number];

const SKELETON = (
  <>
    <div className="h-3 w-3/4 animate-pulse rounded bg-slate-200" />
    <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-slate-200" />
    <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-slate-200" />
  </>
);

const TONE_CLASS: Record<string, string> = {
  positive: 'bg-emerald-50 text-emerald-700',
  negative: 'bg-rose-50 text-rose-700',
};

function IdlePanel({ copy }: { copy: PanelCopy }): JSX.Element {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-[11px] uppercase tracking-[0.18em] text-[#94A3B8]">{copy.idleTitle}</div>
      <p className="mt-2 text-sm text-slate-600">{copy.idleBody}</p>
    </div>
  );
}

function LoadingPanel({
  copy,
  isSimulating,
  simulationError,
}: {
  copy: PanelCopy;
  isSimulating: boolean;
  simulationError: string | null;
}): JSX.Element {
  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-[#94A3B8]">{copy.loadingTitle}</div>
          <p className="mt-1 text-sm text-slate-600">
            {isSimulating ? copy.loadingBody : simulationError ?? copy.errorBody}
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {copy.sectionSimulationEyebrow}
        </span>
      </div>
      <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-4">{SKELETON}</div>
    </div>
  );
}

function ResultHeader({
  result,
  amount,
  title,
  contextLabel,
}: {
  result: AutopilotSimulationResult;
  amount: number;
  title: string;
  contextLabel: string;
}): JSX.Element {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[#94A3B8]">{title}</div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-[#0F172A]">
            {formatCurrency(amount)} · {result.categoryLabel}
          </div>
          <p className="text-sm text-slate-600">{contextLabel}</p>
        </div>
        <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold ${result.safetyBadgeClass}`}>
          <span className={result.safetyBadgeDotClass} aria-hidden />
          {result.safetyBadgeLabel}
        </div>
      </div>
      {result.state === 'warning' && hasText(result.riskBanner) ? (
        <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
          {result.riskBanner}
        </div>
      ) : null}
    </div>
  );
}

function RecommendedCard({
  choice,
  result,
  merchantLabel,
  shown,
}: {
  choice: Card;
  result: AutopilotSimulationResult;
  merchantLabel: string;
  shown: Set<string>;
}): JSX.Element {
  return (
    <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-4">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
        <span>{result.recommendationSectionLabel}</span>
        <span>{result.rewardStrengthLabel}</span>
      </div>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="text-sm font-semibold text-[#0F172A]">{choice.name}</div>
          <p className="text-sm text-slate-600">{merchantLabel}</p>
          {shown.has(choice.sentence) ? null : <p className="text-[12px] text-slate-600">{choice.sentence}</p>}
        </div>
        <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${TONE_CLASS[choice.labelTone] ?? 'bg-slate-100 text-slate-700'}`}>
          {choice.label}
        </span>
      </div>
    </div>
  );
}

function MonthImpact({ result }: { result: AutopilotSimulationResult }): JSX.Element {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
        <span>{result.monthImpactTitle}</span>
        <span>{result.rewardStrengthLabel}</span>
      </div>
      {result.impactSegments.length > 0 ? (
        <AutopilotMonthImpactBar segments={result.impactSegments} />
      ) : (
        <p className="text-xs text-slate-500">No bucket covers this purchase yet, so there is no month impact to show.</p>
      )}
      <div className="space-y-1">
        {result.impactNotes.map((note) => (
          <p key={note} className="text-[11px] text-slate-600">
            {note}
          </p>
        ))}
      </div>
    </div>
  );
}

function AlternativeCard({ choice, title }: { choice: Card; title: string }): JSX.Element {
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-4 py-3">
      <div className="text-xs font-semibold text-[#0F172A]">{title}</div>
      <div className="mt-2 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#0F172A]">{choice.name}</p>
          <p className="text-[12px] text-slate-600">{choice.sentence}</p>
        </div>
        <span className="text-[11px] font-semibold text-slate-500">{choice.label}</span>
      </div>
    </div>
  );
}

function SimulationErrorNote({ copy, message }: { copy: PanelCopy; message: string }): JSX.Element {
  return (
    <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
      <div className="text-[11px] uppercase tracking-[0.14em]">{copy.simulationIssueTitle}</div>
      <p>{message}</p>
      <p className="text-[11px] text-amber-700">{copy.showingPreviousResultNote}</p>
    </div>
  );
}

// Reason blocks in display order, dropping empty ones and any text already shown above (the risk
// banner often repeats the same sentence; showing it five times read as a glitch).
function reasonBlocks(
  result: AutopilotSimulationResult,
  copy: PanelCopy,
  shown: Set<string>
): Array<{ title: string; body: string }> {
  const labels = result.reasonLabels ?? {
    rewards: result.recommendationSectionLabel,
    budget: result.monthImpactTitle,
    risk: copy.simulationIssueTitle,
  };
  const risk = result.riskBanner ?? result.monthImpact.riskNote ?? '';
  return [
    { title: labels.rewards, body: result.recommendationSummary },
    { title: labels.budget, body: result.monthImpactSummary },
    { title: labels.risk, body: risk },
  ].filter((block) => hasText(block.body) && !shown.has(block.body));
}

function shownTexts(result: AutopilotSimulationResult): Set<string> {
  const bannerShown = result.state === 'warning' && hasText(result.riskBanner);
  return new Set<string>(bannerShown ? [result.riskBanner ?? ''] : []);
}

function ResultBody({
  result,
  copy,
  merchant,
}: {
  result: AutopilotSimulationResult;
  copy: PanelCopy;
  merchant: string;
}): JSX.Element {
  const shown = shownTexts(result);
  const recommended = result.cards[0];
  const alternative = result.cards[1];
  return (
    <div className="space-y-4">
      {recommended !== undefined ? (
        <RecommendedCard
          choice={recommended}
          result={result}
          merchantLabel={merchant !== '' ? merchant : copy.unnamedMerchantFallback}
          shown={shown}
        />
      ) : null}
      <div className="grid gap-3 lg:grid-cols-3" id="autopilot-reasons">
        {reasonBlocks(result, copy, shown).map((block) => (
          <ReasonBlock key={block.title} title={block.title} body={block.body} />
        ))}
      </div>
      <MonthImpact result={result} />
      {alternative !== undefined ? <AlternativeCard choice={alternative} title={result.alternativeSectionLabel} /> : null}
    </div>
  );
}

function ResultPanel({
  result,
  copy,
  purchase,
  title,
  isSimulating,
  simulationError,
}: {
  result: AutopilotSimulationResult;
  copy: PanelCopy;
  purchase: AutopilotPurchaseSummary;
  title: string;
  isSimulating: boolean;
  simulationError: string | null;
}): JSX.Element {
  return (
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <ResultHeader
        result={result}
        amount={purchase.amount}
        title={title}
        contextLabel={result.contextLabel ?? copy.sectionSimulationEyebrow}
      />
      {isSimulating ? (
        <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-4">{SKELETON}</div>
      ) : null}
      <ResultBody result={result} copy={copy} merchant={purchase.merchant} />
      {hasText(simulationError) ? <SimulationErrorNote copy={copy} message={simulationError} /> : null}
      <div className="flex flex-wrap items-center gap-2">
        {/* No action buttons: commit is not user-facing before Phase 3 (docs/autopilot-master-spec.md). */}
        <ButtonLink href="#autopilot-reasons" variant="ghost" size="sm">
          Why?
        </ButtonLink>
      </div>
      <p className="text-[11px] text-slate-500">{copy.actionComingSoonNote}</p>
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
  const copy: PanelCopy = { ...uiSpec.panel, ...(simulationResult?.ui ?? {}) };
  if (!hasPurchase || purchaseSummary === null) return <IdlePanel copy={copy} />;
  if (simulationResult === null) {
    return <LoadingPanel copy={copy} isSimulating={isSimulating} simulationError={simulationError} />;
  }
  return (
    <ResultPanel
      result={simulationResult}
      copy={copy}
      purchase={purchaseSummary}
      title={uiSpec.resultTitle}
      isSimulating={isSimulating}
      simulationError={simulationError}
    />
  );
}
