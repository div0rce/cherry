import type { AutopilotPurchaseSummary } from '@/components/autopilot/AutopilotShell';
import { getAutopilotUiSpec } from '@/lib/autopilot/uiSpec';
import type { AutopilotRewardCategory } from '@/lib/autopilot/types';
import {
  AutopilotPreviewOutputSchema,
  type AutopilotPreviewOutput,
} from '@/lib/validation/autopilot/preview';
import { formatCurrency } from '@/lib/formatCurrency';

const AUTOPILOT_UI_SPEC = getAutopilotUiSpec();

export type SimulationCardChoice = {
  id: string;
  name: string;
  sentence: string;
  label: 'Recommended' | 'Alternate card' | 'Use caution';
  labelTone: 'positive' | 'neutral' | 'negative';
};

export type SimulationMonthImpact = {
  extraCash: number;
  feesAvoided: number;
  riskNote: string;
};

export type AutopilotSimulationResult = {
  state: 'recommended' | 'warning';
  cards: SimulationCardChoice[];
  monthImpact: SimulationMonthImpact;
  impactSegments: {
    label: string;
    percentage: number;
    color: string;
  }[];
  impactNotes: string[];
  rewardStrength: 1 | 2 | 3 | 4;
  categoryLabel: string;
  timingLabel: string;
  recommendationSectionLabel: string;
  recommendationSummary: string;
  rewardStrengthLabel: string;
  alternativeSectionLabel: string;
  monthImpactTitle: string;
  monthImpactSummary: string;
  safetyBadgeClass: string;
  safetyBadgeDotClass: string;
  safetyBadgeLabel: string;
  ctaPrimary: string;
  ctaSecondary: string;
  riskBanner?: string;
  errorTimestamp?: string;
  ui: {
    idleTitle: string;
    idleBody: string;
    loadingTitle: string;
    loadingBody: string;
    loadingShimmerLines: number;
    errorTitle: string;
    errorBody: string;
    errorTimestampFallback: string;
    sectionSimulationEyebrow: string;
    unnamedMerchantFallback: string;
    recommendationSectionTitle: string;
    alternativeSectionTitle: string;
    actionComingSoonNote: string;
    simulationIssueTitle: string;
    showingPreviousResultNote: string;
    safetyLabel: string;
  };
};

const categoryLabelMap: Record<AutopilotPurchaseSummary['category'], string> =
  AUTOPILOT_UI_SPEC.form.categoryOptions.reduce(
    (acc, option) => ({ ...acc, [option.value]: option.label }),
    {} as Record<AutopilotPurchaseSummary['category'], string>
  );

const categoryRewardMap: Record<
  AutopilotPurchaseSummary['category'],
  AutopilotRewardCategory
> = AUTOPILOT_UI_SPEC.form.categoryOptions.reduce(
  (acc, option) => ({ ...acc, [option.value]: option.rewardCategory }),
  {} as Record<AutopilotPurchaseSummary['category'], AutopilotRewardCategory>
);

function dollarsToCents(amount: number): number {
  return Math.round(amount * 100);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function clampPercentage(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Number(value.toFixed(1))));
}

function computeRewardStrength(
  benefitCents: number,
  amountCents: number
): 1 | 2 | 3 | 4 {
  if (!Number.isFinite(amountCents) || amountCents <= 0) return 1;
  const ratio = benefitCents / amountCents;
  if (ratio > 0.03) return 4;
  if (ratio > 0.02) return 3;
  if (ratio > 0.01) return 2;
  return 1;
}

function rewardStrengthLabelFor(strength: 1 | 2 | 3 | 4): string {
  if (strength === 4) return 'Strong rewards';
  if (strength === 3) return 'Good rewards';
  if (strength === 2) return 'Moderate rewards';
  return 'Low rewards';
}

function timingLabelFor(value: AutopilotPurchaseSummary['timing']): string {
  const option = AUTOPILOT_UI_SPEC.form.timingOptions.find((entry) => entry.value === value);
  return option?.label ?? AUTOPILOT_UI_SPEC.form.timingOptions[0]?.label ?? 'Now';
}

function ensureImpactSegments(
  input: AutopilotSimulationResult['impactSegments']
): AutopilotSimulationResult['impactSegments'] {
  if (input.length === 3) return input;
  const fallback: AutopilotSimulationResult['impactSegments'] = [
    { label: 'Bucket used', percentage: 30, color: 'bg-[#FECACA]' },
    { label: 'Bucket remaining', percentage: 50, color: 'bg-[#DCFCE7]' },
    { label: 'Everything else', percentage: 20, color: 'bg-[#E2E8F0]' },
  ];
  const padded = [...input];
  while (padded.length < 3) {
    const nextSegment = fallback[padded.length];
    if (nextSegment === undefined) {
      break;
    }
    padded.push(nextSegment);
  }
  return padded.slice(0, 3);
}

function buildImpactSegments(
  preview: AutopilotPreviewOutput,
  fallbackBucketName: string
): AutopilotSimulationResult['impactSegments'] {
  const bucketName = preview.bucketImpact?.name ?? fallbackBucketName;
  const usedCents = Math.max(preview.bucketImpact?.spentCents ?? 0, 0);
  const remainingCents = Math.max(preview.bucketImpact?.remainingCents ?? 0, 0);
  const total = usedCents + remainingCents;

  if (total > 0) {
    const usedPct = clampPercentage((usedCents / total) * 100);
    const remainingPct = clampPercentage((remainingCents / total) * 100);
    const otherPct = clampPercentage(100 - usedPct - remainingPct);
    return ensureImpactSegments([
      { label: `${bucketName} used`, percentage: usedPct, color: 'bg-[#FECACA]' },
      { label: `${bucketName} remaining`, percentage: remainingPct, color: 'bg-[#DCFCE7]' },
      { label: 'Everything else', percentage: otherPct, color: 'bg-[#E2E8F0]' },
    ]);
  }

  return ensureImpactSegments([
    { label: `${bucketName} used`, percentage: 30, color: 'bg-[#FECACA]' },
    { label: `${bucketName} remaining`, percentage: 50, color: 'bg-[#DCFCE7]' },
    { label: 'Everything else', percentage: 20, color: 'bg-[#E2E8F0]' },
  ]);
}

function mapStatusToState(preview: AutopilotPreviewOutput): 'recommended' | 'warning' {
  const hasBudgetPressure =
    preview.bucketImpact?.remainingCents != null && preview.bucketImpact.remainingCents <= 0;
  const hasWarnings = preview.explanation.warnings.length > 0;
  return preview.status === 'ok' && !hasBudgetPressure && !hasWarnings ? 'recommended' : 'warning';
}

function buildImpactNotes(
  preview: AutopilotPreviewOutput,
  bucketLabel: string
): string[] {
  const impactNotes: string[] = [];
  if (preview.bucketImpact?.remainingCents != null) {
    impactNotes.push(
      `Remaining after swipe: ${formatCurrency(preview.bucketImpact.remainingCents / 100)} in ${bucketLabel}.`
    );
  }
  impactNotes.push(...preview.explanation.secondary);
  impactNotes.push(...preview.explanation.warnings);
  return impactNotes;
}

function buildSimulationCards(
  preview: AutopilotPreviewOutput,
  state: AutopilotSimulationResult['state']
): SimulationCardChoice[] {
  const recommendedCard = preview.recommendedCard;
  const primaryName = recommendedCard?.label ?? 'Your usual card';
  const primarySentence =
    preview.explanation.primary?.trim().length > 0
      ? preview.explanation.primary
      : `Use ${primaryName} for this purchase.`;

  const cards: SimulationCardChoice[] = [
    {
      id: recommendedCard?.id ?? 'autopilot-recommendation',
      name: primaryName,
      sentence: primarySentence,
      label: state === 'recommended' ? 'Recommended' : 'Use caution',
      labelTone: state === 'recommended' ? 'positive' : 'negative',
    },
  ];

  const secondarySentence =
    preview.explanation.secondary[0] ?? 'Any alternate card keeps your month similar.';
  cards.push({
    id: 'alternate-card',
    name: 'Alternate card',
    sentence: secondarySentence,
    label: 'Alternate card',
    labelTone: 'neutral',
  });

  return cards;
}

function buildSafetyBadge(state: AutopilotSimulationResult['state']): {
  safetyBadgeClass: string;
  safetyBadgeDotClass: string;
  safetyBadgeLabel: string;
} {
  if (state === 'warning') {
    return {
      safetyBadgeClass: 'bg-[#FEF3C7] text-[#92400E]',
      safetyBadgeDotClass: 'h-2 w-2 rounded-full bg-[#F59E0B]',
      safetyBadgeLabel: 'Check bucket pressure before swiping.',
    };
  }

  return {
    safetyBadgeClass: 'bg-[#F0FDF4] text-[#15803D]',
    safetyBadgeDotClass: 'h-2 w-2 rounded-full bg-[#22C55E]',
    safetyBadgeLabel: 'Safe, simulated only — no charges are made.',
  };
}

function mapPreviewToSimulationResult(
  preview: AutopilotPreviewOutput,
  summary: AutopilotPurchaseSummary
): AutopilotSimulationResult {
  const categoryName = categoryLabelMap[summary.category];
  const bucketLabel = preview.bucketImpact?.name ?? `${categoryName} bucket`;
  const state = mapStatusToState(preview);
  const rewardStrength = computeRewardStrength(preview.expectedBenefitCents, preview.amountCents);
  const rewardStrengthLabel = rewardStrengthLabelFor(rewardStrength);
  const impactSegments = buildImpactSegments(preview, bucketLabel);
  const impactNotes = buildImpactNotes(preview, bucketLabel);
  const cards = buildSimulationCards(preview, state);

  const monthImpactSummaryParts: string[] = [];
  if (preview.bucketImpact?.remainingCents != null) {
    monthImpactSummaryParts.push(
      `Remaining after swipe: ${formatCurrency(preview.bucketImpact.remainingCents / 100)} in ${bucketLabel}.`
    );
  } else {
    monthImpactSummaryParts.push('No bucket impact reported for this simulation.');
  }
  if (preview.expectedBenefitCents > 0) {
    monthImpactSummaryParts.push(
      `Estimated +${formatCurrency(preview.expectedBenefitCents / 100)} vs next best card.`
    );
  }

  const safetyBadge = buildSafetyBadge(state);
  const recommendationSummary =
    preview.explanation.primary?.trim().length > 0
      ? preview.explanation.primary
      : `Use ${cards[0]?.name ?? 'your usual card'} for this purchase.`;

  const warningNote = preview.explanation.warnings.join(' ');

  const riskBanner =
    state === 'warning'
      ? preview.explanation.warnings[0] ?? 'This purchase may stress at least one bucket.'
      : null;

  return {
    state,
    cards,
    monthImpact: {
      extraCash: Number((preview.expectedBenefitCents / 100).toFixed(2)),
      feesAvoided: 0,
      riskNote: warningNote !== '' ? warningNote : 'Buckets stay balanced for this simulated swipe.',
    },
    impactSegments: ensureImpactSegments(impactSegments),
    impactNotes,
    rewardStrength,
    categoryLabel: `${categoryName} bucket`,
    timingLabel: timingLabelFor(summary.timing),
    recommendationSectionLabel: 'Autopilot recommendation',
    recommendationSummary,
    rewardStrengthLabel,
    alternativeSectionLabel: 'Other ways to pay',
    monthImpactTitle: 'Month impact',
    monthImpactSummary: monthImpactSummaryParts.join(' '),
    safetyBadgeClass: safetyBadge.safetyBadgeClass,
    safetyBadgeDotClass: safetyBadge.safetyBadgeDotClass,
    safetyBadgeLabel: safetyBadge.safetyBadgeLabel,
    ctaPrimary: `Use ${cards[0]?.name ?? 'your usual card'} for this purchase`,
    ctaSecondary: 'View bucket impact',
    ...(riskBanner !== null ? { riskBanner } : {}),
    ui: {
      idleTitle: AUTOPILOT_UI_SPEC.panel.idleTitle,
      idleBody: AUTOPILOT_UI_SPEC.panel.idleBody,
      loadingTitle: AUTOPILOT_UI_SPEC.panel.loadingTitle,
      loadingBody: AUTOPILOT_UI_SPEC.panel.loadingBody,
      loadingShimmerLines: AUTOPILOT_UI_SPEC.panel.loadingShimmerLines,
      errorTitle: AUTOPILOT_UI_SPEC.panel.errorTitle,
      errorBody: AUTOPILOT_UI_SPEC.panel.errorBody,
      errorTimestampFallback: AUTOPILOT_UI_SPEC.panel.errorTimestampFallback,
      sectionSimulationEyebrow: AUTOPILOT_UI_SPEC.panel.sectionSimulationEyebrow,
      unnamedMerchantFallback: AUTOPILOT_UI_SPEC.panel.unnamedMerchantFallback,
      recommendationSectionTitle: AUTOPILOT_UI_SPEC.panel.recommendationSectionTitle,
      alternativeSectionTitle: AUTOPILOT_UI_SPEC.panel.alternativeSectionTitle,
      actionComingSoonNote: AUTOPILOT_UI_SPEC.panel.actionComingSoonNote,
      simulationIssueTitle: AUTOPILOT_UI_SPEC.panel.simulationIssueTitle,
      showingPreviousResultNote: AUTOPILOT_UI_SPEC.panel.showingPreviousResultNote,
      safetyLabel: AUTOPILOT_UI_SPEC.panel.safetyLabel,
    },
  };
}

function validateSummary(
  summary: AutopilotPurchaseSummary
): summary is AutopilotPurchaseSummary {
  return (
    typeof summary?.amount === 'number' &&
    summary.amount > 0 &&
    typeof summary.merchant === 'string' &&
    summary.merchant.trim().length > 0
  );
}

function buildPreviewPayload(summary: AutopilotPurchaseSummary) {
  return {
    merchant: summary.merchant.trim(),
    amountCents: dollarsToCents(summary.amount),
    occurredAt: new Date().toISOString(),
    category: categoryRewardMap[summary.category],
  };
}

// NOTE: Ensure output shape remains stable for AutopilotDecisionPanel consumption.
export async function runSimulation(
  summary: AutopilotPurchaseSummary
): Promise<AutopilotSimulationResult> {
  // Adapter: UI-only entry point. Maps AutopilotPurchaseSummary → /api/autopilot/preview → AutopilotSimulationResult. See docs/autopilot-engine-adapter.md.
  if (!validateSummary(summary)) {
    throw {
      message: 'Invalid simulation summary',
      errorTimestamp: new Date().toISOString(),
    };
  }

  const payload = buildPreviewPayload(summary);

  let response: Response;
  try {
    response = await fetch('/api/autopilot/preview', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    throw {
      message:
        error instanceof Error
          ? error.message
          : 'Unable to reach Autopilot preview endpoint',
      errorTimestamp: new Date().toISOString(),
    };
  }

  if (!response.ok) {
    let message = 'Autopilot preview failed';
    let code: string | undefined;
    try {
      const errorBody: unknown = await response.json();
      if (isRecord(errorBody)) {
        if (typeof errorBody['error'] === 'string') {
          message = errorBody['error'];
        }
        if (typeof errorBody['code'] === 'string') {
          code = errorBody['code'];
        }
      }
    } catch {
      // ignore parse errors and fall back to generic message
    }
    const errorPayload: { message: string; errorTimestamp: string; code?: string } = {
      message,
      errorTimestamp: new Date().toISOString(),
    };
    if (code !== undefined && code !== '') {
      errorPayload.code = code;
    }
    throw errorPayload;
  }

  const raw: unknown = await response.json();
  const parsed = AutopilotPreviewOutputSchema.safeParse(raw);
  if (!parsed.success) {
    throw {
      message: 'Autopilot returned an invalid response',
      errorTimestamp: new Date().toISOString(),
    };
  }

  return mapPreviewToSimulationResult(parsed.data, summary);
}
