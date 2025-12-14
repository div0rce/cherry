import type { AutopilotPurchaseSummary } from '@/components/autopilot/AutopilotShell';
import type { AutopilotRewardCategory } from '@/lib/autopilot/types';
import {
  AutopilotPreviewOutputSchema,
  type AutopilotPreviewOutput,
} from '@/lib/validation/autopilot/preview';

export type SimulationCardChoice = {
  id: string;
  name: string;
  sentence: string;
  label: string;
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
    actionComingSoonNote: string;
    simulationIssueTitle: string;
    showingPreviousResultNote: string;
    safetyLabel: string;
  };
};

const CATEGORY_REWARD_MAP: Record<AutopilotPurchaseSummary['category'], AutopilotRewardCategory> = {
  dining: 'DINING',
  groceries: 'GROCERIES',
  travel: 'TRAVEL',
  gas: 'GAS',
  other: 'OTHER',
};

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

function computeRewardStrength(benefitCents: number, amountCents: number): 1 | 2 | 3 | 4 {
  if (!Number.isFinite(amountCents) || amountCents <= 0) return 1;
  const ratio = benefitCents / amountCents;
  if (ratio > 0.03) return 4;
  if (ratio > 0.02) return 3;
  if (ratio > 0.01) return 2;
  return 1;
}

function ensureImpactSegments(
  input: AutopilotSimulationResult['impactSegments'],
  fallbackSegments: AutopilotPreviewOutput['ui']['impact']['fallbackSegments']
): AutopilotSimulationResult['impactSegments'] {
  if (input.length === 3) return input;
  const fallback: AutopilotSimulationResult['impactSegments'] = [
    { label: fallbackSegments.usedLabel, percentage: 30, color: 'bg-[#FECACA]' },
    { label: fallbackSegments.remainingLabel, percentage: 50, color: 'bg-[#DCFCE7]' },
    { label: fallbackSegments.otherLabel, percentage: 20, color: 'bg-[#E2E8F0]' },
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

function buildImpactSegments(preview: AutopilotPreviewOutput): AutopilotSimulationResult['impactSegments'] {
  const bucketName = preview.bucketImpact?.name ?? null;
  const usedCents = Math.max(preview.bucketImpact?.spentCents ?? 0, 0);
  const remainingCents = Math.max(preview.bucketImpact?.remainingCents ?? 0, 0);
  const total = usedCents + remainingCents;
  const bucketUsedLabel = bucketName
    ? preview.ui.impact.bucketUsedTemplate.replace('${bucketName}', bucketName)
    : preview.ui.impact.fallbackSegments.usedLabel;
  const bucketRemainingLabel = bucketName
    ? preview.ui.impact.bucketRemainingTemplate.replace('${bucketName}', bucketName)
    : preview.ui.impact.fallbackSegments.remainingLabel;
  const otherLabel = preview.ui.impact.fallbackSegments.otherLabel;

  if (total > 0) {
    const usedPct = clampPercentage((usedCents / total) * 100);
    const remainingPct = clampPercentage((remainingCents / total) * 100);
    const otherPct = clampPercentage(100 - usedPct - remainingPct);
    return ensureImpactSegments(
      [
        { label: bucketUsedLabel, percentage: usedPct, color: 'bg-[#FECACA]' },
        { label: bucketRemainingLabel, percentage: remainingPct, color: 'bg-[#DCFCE7]' },
        { label: otherLabel, percentage: otherPct, color: 'bg-[#E2E8F0]' },
      ],
      preview.ui.impact.fallbackSegments
    );
  }

  return ensureImpactSegments(
    [
      { label: bucketUsedLabel, percentage: 30, color: 'bg-[#FECACA]' },
      { label: bucketRemainingLabel, percentage: 50, color: 'bg-[#DCFCE7]' },
      { label: otherLabel, percentage: 20, color: 'bg-[#E2E8F0]' },
    ],
    preview.ui.impact.fallbackSegments
  );
}

function mapStatusToState(preview: AutopilotPreviewOutput): 'recommended' | 'warning' {
  const hasBudgetPressure =
    preview.bucketImpact?.remainingCents != null && preview.bucketImpact.remainingCents <= 0;
  const hasWarnings = preview.explanation.warnings.length > 0;
  return preview.status === 'ok' && !hasBudgetPressure && !hasWarnings ? 'recommended' : 'warning';
}

function buildImpactNotes(preview: AutopilotPreviewOutput): string[] {
  const impactNotes: string[] = [];
  impactNotes.push(...preview.explanation.secondary);
  impactNotes.push(...preview.explanation.warnings);
  return impactNotes;
}

function buildSimulationCards(
  preview: AutopilotPreviewOutput,
  state: AutopilotSimulationResult['state']
): SimulationCardChoice[] {
  const recommendedCard = preview.recommendedCard;
  const primaryName = recommendedCard?.label ?? preview.ui.cardLabels.usualCardFallback;
  const primarySentence =
    preview.explanation.primary?.trim().length > 0
      ? preview.explanation.primary
      : preview.ui.ctas.primaryTemplate.replace('${cardName}', primaryName);

  const cards: SimulationCardChoice[] = [
    {
      id: recommendedCard?.id ?? 'autopilot-recommendation',
      name: primaryName,
      sentence: primarySentence,
      label: state === 'recommended' ? preview.ui.cardLabels.recommended : preview.ui.cardLabels.caution,
      labelTone: state === 'recommended' ? 'positive' : 'negative',
    },
  ];

  const secondarySentence = preview.explanation.secondary[0] ?? '';
  cards.push({
    id: 'alternate-card',
    name: preview.ui.cardLabels.alternate,
    sentence: secondarySentence,
    label: preview.ui.cardLabels.alternate,
    labelTone: 'neutral',
  });

  return cards;
}

function buildSafetyBadge(
  tone: AutopilotPreviewOutput['ui']['badge']['tone'],
  label: string
): {
  safetyBadgeClass: string;
  safetyBadgeDotClass: string;
  safetyBadgeLabel: string;
} {
  if (tone === 'negative') {
    return {
      safetyBadgeClass: 'bg-[#FEF3C7] text-[#92400E]',
      safetyBadgeDotClass: 'h-2 w-2 rounded-full bg-[#F59E0B]',
      safetyBadgeLabel: label,
    };
  }

  if (tone === 'neutral') {
    return {
      safetyBadgeClass: 'bg-[#E2E8F0] text-[#0F172A]',
      safetyBadgeDotClass: 'h-2 w-2 rounded-full bg-[#64748B]',
      safetyBadgeLabel: label,
    };
  }

  return {
    safetyBadgeClass: 'bg-[#F0FDF4] text-[#15803D]',
    safetyBadgeDotClass: 'h-2 w-2 rounded-full bg-[#22C55E]',
    safetyBadgeLabel: label,
  };
}

function mapPreviewToSimulationResult(
  preview: AutopilotPreviewOutput,
  summary: AutopilotPurchaseSummary
): AutopilotSimulationResult {
  const categoryLabel = String(summary.category);
  const state = mapStatusToState(preview);
  const rewardStrength = computeRewardStrength(preview.expectedBenefitCents, preview.amountCents);
  const rewardStrengthLabel = preview.ui.rewardStrength.label;
  const impactSegments = buildImpactSegments(preview);
  const impactNotes = buildImpactNotes(preview);
  const cards = buildSimulationCards(preview, state);

  const safetyBadge = buildSafetyBadge(preview.ui.badge.tone, preview.ui.badge.label);
  const recommendationSummary =
    preview.explanation.primary?.trim().length > 0
      ? preview.explanation.primary
      : preview.ui.ctas.primaryTemplate.replace(
          '${cardName}',
          cards[0]?.name ?? preview.ui.cardLabels.usualCardFallback
        );

  const warningNote = preview.explanation.warnings.join(' ').trim();

  const riskBanner =
    state === 'warning' ? (preview.explanation.warnings[0] ?? null) : null;

  return {
    state,
    cards,
    monthImpact: {
      extraCash: Number((preview.expectedBenefitCents / 100).toFixed(2)),
      feesAvoided: 0,
      riskNote: warningNote,
    },
    impactSegments: ensureImpactSegments(impactSegments, preview.ui.impact.fallbackSegments),
    impactNotes,
    rewardStrength,
    categoryLabel,
    timingLabel: String(summary.timing),
    recommendationSectionLabel: preview.ui.sections.recommendation,
    recommendationSummary,
    rewardStrengthLabel,
    alternativeSectionLabel: preview.ui.sections.alternatives,
    monthImpactTitle: preview.ui.sections.monthImpactTitle,
    monthImpactSummary: preview.explanation.secondary.join(' ').trim(),
    safetyBadgeClass: safetyBadge.safetyBadgeClass,
    safetyBadgeDotClass: safetyBadge.safetyBadgeDotClass,
    safetyBadgeLabel: safetyBadge.safetyBadgeLabel,
    ctaPrimary: preview.ui.ctas.primaryTemplate.replace(
      '${cardName}',
      cards[0]?.name ?? preview.ui.cardLabels.usualCardFallback
    ),
    ctaSecondary: preview.ui.ctas.secondary,
    ...(riskBanner !== null ? { riskBanner } : {}),
    ui: preview.ui.panel,
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
    category: CATEGORY_REWARD_MAP[summary.category],
  };
}

// NOTE: Ensure output shape remains stable for AutopilotDecisionPanel consumption.
export async function runSimulation(
  summary: AutopilotPurchaseSummary
): Promise<AutopilotSimulationResult> {
  // Adapter: UI-only entry point. Maps AutopilotPurchaseSummary → /api/autopilot/preview → AutopilotSimulationResult. See docs/autopilot-engine-adapter.md.
  if (!validateSummary(summary)) {
    throw {
      message: 'INVALID_SIMULATION_SUMMARY',
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
    const message =
      error instanceof Error && typeof error.message === 'string' && error.message.length > 0
        ? error.message
        : 'PREVIEW_REQUEST_FAILED';
    throw { message, errorTimestamp: new Date().toISOString() };
  }

  if (!response.ok) {
    let message: string | undefined;
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
    const fallbackMessage =
      typeof response.statusText === 'string' && response.statusText.length > 0
        ? response.statusText
        : 'PREVIEW_ERROR';
    const errorPayload: { message: string; errorTimestamp: string; code?: string } = {
      message: message ?? fallbackMessage,
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
      message: 'PREVIEW_RESPONSE_INVALID',
      errorTimestamp: new Date().toISOString(),
    };
  }

  return mapPreviewToSimulationResult(parsed.data, summary);
}
