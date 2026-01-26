import type { AutopilotPurchaseSummary } from '../../components/autopilot/AutopilotShell';
import type { AutopilotRewardCategory } from './types';
import {
  AutopilotPreviewOutputSchema,
  type AutopilotPreviewOutput,
} from '../validation/autopilot/preview.js';
import { fetchJSON } from '../api/fetch-json.js';
import { asAppError } from '../errors.js';

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
  contextLabel: string;
  reasonLabels: {
    rewards: string;
    budget: string;
    risk: string;
  };
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
  const hasBucketName = typeof bucketName === 'string' && bucketName.trim().length > 0;
  const usedCents = Math.max(preview.bucketImpact?.spentCents ?? 0, 0);
  const remainingCents = Math.max(preview.bucketImpact?.remainingCents ?? 0, 0);
  const total = usedCents + remainingCents;
  const bucketUsedLabel = hasBucketName
    ? preview.ui.impact.bucketUsedTemplate.replace('${bucketName}', bucketName)
    : preview.ui.impact.fallbackSegments.usedLabel;
  const bucketRemainingLabel = hasBucketName
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
  const hasWarnings = preview.ui.explanation.warnings.length > 0;
  return preview.status === 'ok' && !hasBudgetPressure && !hasWarnings ? 'recommended' : 'warning';
}

function buildImpactNotes(preview: AutopilotPreviewOutput): string[] {
  const impactNotes: string[] = [];
  impactNotes.push(...preview.ui.explanation.secondary);
  impactNotes.push(...preview.ui.explanation.warnings);
  return impactNotes;
}

function buildSimulationCards(
  preview: AutopilotPreviewOutput,
  state: AutopilotSimulationResult['state']
): SimulationCardChoice[] {
  const recommendedCard = preview.recommendedCard;
  const primaryName = recommendedCard?.label ?? preview.ui.cardLabels.usualCardFallback;
  const primarySentence =
    preview.ui.explanation.primary?.trim().length > 0
      ? preview.ui.explanation.primary
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

  const secondarySentence = preview.ui.explanation.secondary[0] ?? '';
  cards.push({
    id: 'alternate-card',
    name: preview.ui.cardLabels.alternate,
    sentence: secondarySentence,
    label: preview.ui.cardLabels.alternate,
    labelTone: 'neutral',
  });

  return cards;
}

function buildSafetyBadge(badge: AutopilotPreviewOutput['ui']['badge']): {
  safetyBadgeClass: string;
  safetyBadgeDotClass: string;
  safetyBadgeLabel: string;
} {
  const severity = badge.severity;
  const label = badge.label;

  if (severity === 'negative') {
    return {
      safetyBadgeClass: 'bg-[#FEE2E2] text-[#991B1B]',
      safetyBadgeDotClass: 'h-2 w-2 rounded-full bg-[#DC2626]',
      safetyBadgeLabel: label,
    };
  }

  if (severity === 'neutral') {
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
  const categoryLabel =
    preview.ui.formLabels.category[summary.category] ?? String(summary.category);
  const timingLabel = preview.ui.formLabels.timing[summary.timing] ?? String(summary.timing);
  const state = mapStatusToState(preview);
  const rewardStrength = preview.ui.rewardStrength.level;
  const rewardStrengthLabel = preview.ui.rewardStrength.label;
  const impactSegments = buildImpactSegments(preview);
  const impactNotes = buildImpactNotes(preview);
  const cards = buildSimulationCards(preview, state);

  const safetyBadge = buildSafetyBadge(preview.ui.badge);
  const recommendationSummary =
    preview.ui.explanation.primary?.trim().length > 0
      ? preview.ui.explanation.primary
      : preview.ui.ctas.primaryTemplate.replace(
          '${cardName}',
          cards[0]?.name ?? preview.ui.cardLabels.usualCardFallback
        );

  const warningNote = preview.ui.explanation.warnings.join(' ').trim();

  const riskBanner =
    state === 'warning' ? (preview.ui.explanation.warnings[0] ?? null) : null;

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
    timingLabel,
    recommendationSectionLabel: preview.ui.sections.recommendation,
    recommendationSummary,
    rewardStrengthLabel,
    alternativeSectionLabel: preview.ui.sections.alternatives,
    monthImpactTitle: preview.ui.sections.monthImpactTitle,
    monthImpactSummary: preview.ui.explanation.secondary.join(' ').trim(),
    safetyBadgeClass: safetyBadge.safetyBadgeClass,
    safetyBadgeDotClass: safetyBadge.safetyBadgeDotClass,
    safetyBadgeLabel: safetyBadge.safetyBadgeLabel,
    ctaPrimary: preview.ui.ctas.primaryTemplate.replace(
      '${cardName}',
      cards[0]?.name ?? preview.ui.cardLabels.usualCardFallback
    ),
    ctaSecondary: preview.ui.ctas.secondary,
    contextLabel: preview.ui.panel.sectionSimulationEyebrow,
    reasonLabels: {
      rewards: preview.ui.sections.recommendation,
      budget: preview.ui.sections.monthImpactTitle,
      risk: preview.ui.panel.simulationIssueTitle,
    },
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

function buildPreviewPayload(summary: AutopilotPurchaseSummary, now: Date) {
  return {
    merchant: summary.merchant.trim(),
    amountCents: dollarsToCents(summary.amount),
    occurredAt: now.toISOString(),
    category: CATEGORY_REWARD_MAP[summary.category],
  };
}

// NOTE: Ensure output shape remains stable for AutopilotDecisionPanel consumption.
export async function runSimulation(
  summary: AutopilotPurchaseSummary,
  options: { now: Date }
): Promise<AutopilotSimulationResult> {
  const nowIso = options.now.toISOString();
  // Adapter: UI-only entry point. Maps AutopilotPurchaseSummary → /api/autopilot/preview → AutopilotSimulationResult. See docs/autopilot-engine-adapter.md.
  if (!validateSummary(summary)) {
    throw {
      message: 'INVALID_SIMULATION_SUMMARY',
      errorTimestamp: nowIso,
    };
  }

  const payload = buildPreviewPayload(summary, options.now);

  let raw: unknown;
  try {
    raw = await fetchJSON<unknown>('/api/autopilot/preview', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (error: unknown) {
    const appError = asAppError(error);
    const details = appError.details;
    const code =
      isRecord(details) && typeof details['code'] === 'string' ? details['code'] : undefined;
    const message =
      typeof appError.message === 'string' && appError.message.length > 0
        ? appError.message
        : 'PREVIEW_ERROR';
    const errorPayload: { message: string; errorTimestamp: string; code?: string } = {
      message,
      errorTimestamp: nowIso,
    };
    if (code !== undefined && code !== '') {
      errorPayload.code = code;
    }
    throw errorPayload;
  }
  const parsed = AutopilotPreviewOutputSchema.safeParse(raw);
  if (!parsed.success) {
    throw {
      message: 'PREVIEW_RESPONSE_INVALID',
      errorTimestamp: nowIso,
    };
  }

  return mapPreviewToSimulationResult(parsed.data, summary);
}
