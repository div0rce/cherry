import {
  BudgetVerdict,
  CardVerdict,
  CategoryCoverageModeDb,
  OverallVerdict,
  RecommendationSource,
  RecommendationVerdict,
  RecommendationStatus,
  SessionAnomalyCode,
  TransactionStatus,
  VerificationStatus,
} from '@prisma/client';
import type { Prisma, RewardCategory } from '@prisma/client';
import type { AutopilotDecision } from '../engine/public-types.js';
import { getAutopilotDecisionForUserSwipe as runEngineAutopilot } from './engine-decision.js';
import { deriveUnresolvableCreditLiabilityWarningText } from '../engine/degradation.js';
import { logInvariantViolation } from '../log.js';
import { prisma } from '../prisma.js';
import { recordDecisionEvent, simulateSpendAuthority } from '../adapters/runtime/authority.prisma.js';
import type { World } from '../adapters/world.js';
import { resolveScanCategory } from '../scan-helpers.js';
import { ensureBucketFresh } from '../buckets/ensure-fresh.js';
import { asAppError } from '../errors.js';
import {
  computeBucketBalance,
  toBucketRuntime,
  type BucketRuntime,
} from '../buckets-runtime.js';
import { hasText } from '../text.js';
import type {
  AutopilotCommitInput,
  AutopilotCommitResult,
  AutopilotDecisionStatus,
  AutopilotRecommendedCard,
  AutopilotRewardCategory,
} from './types.js';
import { AutopilotServiceError } from './types.js';
import { getAutopilotUiSpec } from './uiSpec.js';
import type {
  AutopilotPreviewOutput,
  AutopilotPreviewUiBundle,
} from '../validation/autopilot/preview.js';
import { AutopilotPreviewOutputSchema } from '../validation/autopilot/preview.js';
import { incrementCounter, observeDuration } from '../metrics/autopilot.js';
import { confirmRecommendationSession, SessionConfirmError } from '../sessions/confirm-service.js';
import {
  buildAutopilotStateSnapshot,
  buildAutopilotStateSnapshotHash,
  computeEngineDecisionIdV1,
} from './engineDecisionId.js';

export type AutopilotPreviewEngineContext = {
  merchant: string;
  amountCents: number;
  occurredAt?: string;
  category: AutopilotRewardCategory;
};

type CardSummary = {
  id: string;
  nickname: string;
  issuer: string | null;
  network: string | null;
  isCredit: boolean;
};

type EvaluatedAutopilotContext = {
  merchant: string;
  amountCents: number;
  occurredAt: Date;
  category: AutopilotRewardCategory;
  resolvedCategory: RewardCategory;
  decision: AutopilotDecision;
  decisionId: string;
  engineDecisionId: string;
  status: AutopilotDecisionStatus;
  expectedMonetaryBenefitCents: number | null;
  expectedPointsDelta: number | null;
  bucketImpact: AutopilotPreviewOutput['bucketImpact'];
  bucketName: string | null;
  recommendedCard: CardSummary | null;
  cards: CardSummary[];
  stateSnapshotHash: string;
};

const ENGINE_TIMEOUT_MS = 1500;

function parseOccurredAt(raw: string | undefined, fallback: Date): Date {
  const date = raw === undefined ? fallback : new Date(raw);
  if (!Number.isFinite(date.getTime())) {
    throw new AutopilotServiceError('Invalid occurredAt timestamp', 400, 'INVALID_OCCURRED_AT');
  }
  return date;
}

function mapKindToStatus(kind: AutopilotDecision['kind']): AutopilotDecisionStatus {
  if (kind === 'BLOCKED') return 'blocked';
  if (kind === 'FALLBACK') return 'fallback';
  return 'ok';
}

function toRecommendedCard(card: CardSummary | null): AutopilotRecommendedCard | null {
  if (card === null) return null;
  const label = hasText(card.nickname) ? card.nickname : card.id;
  return {
    id: card.id,
    label,
    issuer: card.issuer,
    network: card.network,
  };
}

function buildPreviewUiBundle(options: {
  explanation: AutopilotPreviewUiBundle['explanation'];
  rewardStrengthLevel: AutopilotPreviewUiBundle['rewardStrength']['level'];
}): AutopilotPreviewUiBundle {
  const { explanation, rewardStrengthLevel } = options;
  const spec = getAutopilotUiSpec();

  return {
    badge: {
      severity: 'neutral',
      label: spec.panel.safetyLabel,
    },
    cardLabels: {
      recommended: 'Recommended',
      alternate: 'Alternate card',
      caution: 'Use caution',
      usualCardFallback: 'Your usual card',
    },
    rewardStrength: {
      label: 'Good rewards',
      level: rewardStrengthLevel,
    },
    impact: {
      fallbackSegments: {
        usedLabel: 'Bucket used',
        remainingLabel: 'Bucket remaining',
        otherLabel: 'Everything else',
      },
      bucketUsedTemplate: '${bucketName} used',
      bucketRemainingTemplate: '${bucketName} remaining',
    },
    sections: {
      recommendation: 'Primary recommendation',
      alternatives: 'See alternatives',
      monthImpactTitle: 'Month impact',
    },
    ctas: {
      primaryTemplate: 'Use ${cardName} for this purchase',
      secondary: 'See alternatives',
    },
    explanation,
    panel: {
      idleTitle: spec.panel.idleTitle,
      idleBody: spec.panel.idleBody,
      loadingTitle: spec.panel.loadingTitle,
      loadingBody: spec.panel.loadingBody,
      loadingShimmerLines: spec.panel.loadingShimmerLines,
      errorTitle: spec.panel.errorTitle,
      errorBody: spec.panel.errorBody,
      errorTimestampFallback: spec.panel.errorTimestampFallback,
      sectionSimulationEyebrow: spec.panel.sectionSimulationEyebrow,
      unnamedMerchantFallback: spec.panel.unnamedMerchantFallback,
      simulationIssueTitle: spec.panel.simulationIssueTitle,
      showingPreviousResultNote: spec.panel.showingPreviousResultNote,
      actionComingSoonNote: spec.panel.actionComingSoonNote,
      safetyLabel: spec.panel.safetyLabel,
    },
    formLabels: {
      category: spec.form.categoryOptions.reduce<Record<string, string>>((acc, option) => {
        acc[option.value] = option.label;
        return acc;
      }, {}),
      timing: spec.form.timingOptions.reduce<Record<string, string>>((acc, option) => {
        acc[option.value] = option.label;
        return acc;
      }, {}),
    },
  };
}

async function withTimeout<T>(promise: Promise<T>, ms: number, onTimeoutCode: string): Promise<T> {
  let timer: NodeJS.Timeout | null = null;
  return await Promise.race<T>([
    promise.finally(() => {
      if (timer !== null) {
        clearTimeout(timer);
      }
    }),
    new Promise<T>((_resolve, reject) => {
      timer = setTimeout(() => {
        reject(new AutopilotServiceError('Autopilot timed out', 503, onTimeoutCode));
      }, ms);
    }),
  ]);
}

async function buildBucketImpact(
  bucketDelta: AutopilotDecision['bucketDelta'],
  userId: string
): Promise<AutopilotPreviewOutput['bucketImpact']> {
  if (bucketDelta === null) return null;

  const bucket = await prisma.bucket.findUnique({
    where: { id: bucketDelta.bucketId, userId },
    select: { name: true },
  });

  return {
    bucketId: bucketDelta.bucketId,
    name: bucket?.name ?? null,
    remainingCents: bucketDelta.newRemainingCents,
    spentCents: bucketDelta.newSpentCents,
  };
}

function requireUser(userId: string): void {
  if (!hasText(userId)) {
    throw new AutopilotServiceError('User is required', 400, 'INVALID_USER');
  }
}

function requireMerchant(rawMerchant: string): string {
  const merchant = rawMerchant.trim();
  if (!hasText(merchant)) {
    throw new AutopilotServiceError('Merchant is required', 400, 'INVALID_MERCHANT');
  }
  return merchant;
}

function requirePositiveAmountCents(rawAmountCents: number): number {
  const amountCents = Math.round(rawAmountCents);
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    throw new AutopilotServiceError('Amount must be positive', 400, 'INVALID_AMOUNT');
  }
  return amountCents;
}

async function loadUserCards(userId: string): Promise<CardSummary[]> {
  return await prisma.card.findMany({
    where: { userId },
    select: { id: true, nickname: true, issuer: true, network: true, isCredit: true },
    orderBy: { createdAt: 'asc' },
  });
}

async function runEngineDecision(
  world: World,
  params: {
    userId: string;
    merchant: string;
    amountCents: number;
    cardUniverseIds: string[];
    occurredAt: Date;
  },
  timeoutMs: number | undefined
): Promise<AutopilotDecision> {
  try {
    const engineCall = runEngineAutopilot(world, {
      userId: params.userId,
      merchant: params.merchant,
      amountCents: params.amountCents,
      cardUniverseIds: params.cardUniverseIds,
      nowMs: params.occurredAt.getTime(),
    });
    return typeof timeoutMs === 'number'
      ? await withTimeout(engineCall, timeoutMs, 'ENGINE_TIMEOUT')
      : await engineCall;
  } catch (error: unknown) {
    const appError = asAppError(error);
    if (error instanceof AutopilotServiceError) {
      throw error;
    }
    throw new AutopilotServiceError(
      'Unable to evaluate Autopilot right now',
      500,
      'ENGINE_ERROR',
      appError.message
    );
  }
}

function findRecommendedCard(
  cards: CardSummary[],
  cardId: AutopilotDecision['cardId']
): CardSummary | null {
  return cardId !== null ? cards.find((card) => card.id === cardId) ?? null : null;
}

function computeEngineDecisionIdOrThrow(params: {
  userId: string;
  amountCents: number;
  merchant: string;
  resolvedCategory: RewardCategory;
  occurredAt: Date;
  stateSnapshotHash: string;
}): string {
  try {
    return computeEngineDecisionIdV1({
      userId: params.userId,
      source: RecommendationSource.AUTOPILOT,
      amountCents: params.amountCents,
      currency: 'USD',
      merchantName: params.merchant,
      category: params.resolvedCategory,
      effectiveAt: params.occurredAt,
      stateSnapshotHash: params.stateSnapshotHash,
    });
  } catch (error: unknown) {
    const appError = asAppError(error);
    throw new AutopilotServiceError(
      'Unable to build decision fingerprint',
      400,
      'INVALID_IDEMPOTENCY',
      appError.message
    );
  }
}

function warnOnUnexpectedEngineDecisionIdPrefix(engineDecisionId: string, occurredAt: Date): void {
  if (!engineDecisionId.startsWith('edid_v1_')) {
    logInvariantViolation({
      surface: 'autopilot',
      detail: 'Unexpected engineDecisionId prefix',
      data: { engineDecisionId },
      timestamp: occurredAt.toISOString(),
    });
  }
}

async function evaluateAutopilot(
  world: World,
  userId: string,
  input: AutopilotPreviewEngineContext,
  options: { timeoutMs?: number; now: Date }
): Promise<EvaluatedAutopilotContext> {
  requireUser(userId);
  const merchant = requireMerchant(input.merchant);

  const resolvedCategory: RewardCategory = await resolveScanCategory({
    userId,
    merchantName: merchant,
    mccCode: null,
    explicitCategory: input.category ?? null,
  });

  const amountCents = requirePositiveAmountCents(input.amountCents);
  const occurredAt = parseOccurredAt(input.occurredAt, options.now);

  const cards = await loadUserCards(userId);
  const cardUniverseIds = cards.map((card) => card.id);

  const decision = await runEngineDecision(
    world,
    { userId, merchant, amountCents, cardUniverseIds, occurredAt },
    options.timeoutMs
  );

  const status = mapKindToStatus(decision.kind);
  const recommendedCard = findRecommendedCard(cards, decision.cardId);

  const bucketImpact = await buildBucketImpact(decision.bucketDelta, userId);
  const stateSnapshot = await buildAutopilotStateSnapshot({
    userId,
    category: resolvedCategory,
    effectiveAt: occurredAt,
    cards,
  });
  const stateSnapshotHash = buildAutopilotStateSnapshotHash(stateSnapshot);
  const engineDecisionId = computeEngineDecisionIdOrThrow({
    userId,
    amountCents,
    merchant,
    resolvedCategory,
    occurredAt,
    stateSnapshotHash,
  });
  warnOnUnexpectedEngineDecisionIdPrefix(engineDecisionId, occurredAt);

  return {
    merchant,
    amountCents,
    occurredAt,
    category: input.category,
    resolvedCategory,
    decision,
    decisionId: engineDecisionId,
    engineDecisionId,
    status,
    expectedMonetaryBenefitCents: decision.expectedMonetaryBenefitCents,
    expectedPointsDelta: decision.expectedPointsDelta,
    bucketImpact,
    bucketName: bucketImpact?.name ?? null,
    recommendedCard,
    cards,
    stateSnapshotHash,
  };
}

function deriveBudgetVerdict(bucketImpact: AutopilotPreviewOutput['bucketImpact']): BudgetVerdict {
  if (bucketImpact === null) return BudgetVerdict.UNCONFIGURED;
  if (bucketImpact.remainingCents !== null && bucketImpact.remainingCents <= 0) {
    return BudgetVerdict.BREAKS_BUDGET;
  }
  return BudgetVerdict.HEALTHY;
}

function deriveOverallVerdict(
  status: AutopilotDecisionStatus,
  budgetVerdict: BudgetVerdict
): OverallVerdict {
  if (status !== 'ok') return OverallVerdict.RED;
  if (budgetVerdict === BudgetVerdict.BREAKS_BUDGET) return OverallVerdict.RED;
  if (budgetVerdict === BudgetVerdict.BORDERLINE) return OverallVerdict.YELLOW;
  return OverallVerdict.GREEN;
}


type SessionVerdicts = {
  budgetVerdict: BudgetVerdict;
  cardVerdict: CardVerdict;
  overallVerdict: OverallVerdict;
};

function deriveSessionVerdicts(evaluation: EvaluatedAutopilotContext): SessionVerdicts {
  const budgetVerdict = deriveBudgetVerdict(evaluation.bucketImpact);
  const overallVerdict = deriveOverallVerdict(evaluation.status, budgetVerdict);
  const cardVerdict =
    evaluation.recommendedCard === null ? CardVerdict.NO_CARD_DATA : CardVerdict.OPTIMAL;
  return { budgetVerdict, cardVerdict, overallVerdict };
}

function toRecommendationVerdict(budgetVerdict: BudgetVerdict): RecommendationVerdict {
  return budgetVerdict === BudgetVerdict.BREAKS_BUDGET
    ? RecommendationVerdict.BREAKS_BUDGET
    : RecommendationVerdict.HEALTHY;
}

function buildSessionRecommendationFields(evaluation: EvaluatedAutopilotContext): {
  recommendedCardId: string | null;
  recommendedBucketId: string | null;
} {
  return {
    recommendedCardId: evaluation.recommendedCard?.id ?? null,
    recommendedBucketId: evaluation.decision.bucketDelta?.bucketId ?? null,
  };
}

function buildSessionCreateData(options: {
  evaluation: EvaluatedAutopilotContext;
  userId: string;
  resolvedCategory: RewardCategory;
  now: Date;
  verdicts: SessionVerdicts;
}) {
  const { evaluation, userId, resolvedCategory, verdicts } = options;
  return {
    userId,
    merchantName: evaluation.merchant,
    mccCode: null,
    category: resolvedCategory,
    amountCents: evaluation.amountCents,
    currency: 'USD',
    deviceId: null,
    storeId: null,
    terminalId: null,
    orderId: null,
    orderToken: evaluation.engineDecisionId,
    source: RecommendationSource.AUTOPILOT,
    engineDecisionId: evaluation.engineDecisionId,
    ...buildSessionRecommendationFields(evaluation),
    confirmedAmountCents: null,
    bucketSpendReversed: false,
    verdict: toRecommendationVerdict(verdicts.budgetVerdict),
    cherryPointsOffered: 0,
    status: RecommendationStatus.RECOMMENDED,
    expiresAt: new Date(options.now.getTime() + 15 * 60 * 1000),
    verifiedAt: null,
    rejectedAt: null,
    ...verdicts,
    coverageMode: CategoryCoverageModeDb.UNCONFIGURED,
    verificationStatus: VerificationStatus.UNVERIFIED,
    anomalyCode: SessionAnomalyCode.NONE,
    anomalyDetails: null,
  };
}

async function findOrCreateAutopilotSession(options: {
  evaluation: EvaluatedAutopilotContext;
  userId: string;
  resolvedCategory: RewardCategory;
  now: Date;
}): Promise<{ id: string; recommendedBucketId: string | null }> {
  const { evaluation, userId } = options;
  const verdicts = deriveSessionVerdicts(evaluation);

  if (!hasText(evaluation.engineDecisionId)) {
    throw new AutopilotServiceError('Invariant: missing engineDecisionId for AUTOPILOT', 500, 'MISSING_ENGINE_DECISION_ID');
  }

  const session = await prisma.recommendationSession.upsert({
    where: {
      userId_source_engineDecisionId: {
        userId,
        source: RecommendationSource.AUTOPILOT,
        engineDecisionId: evaluation.engineDecisionId,
      },
    },
    update: {
      ...buildSessionRecommendationFields(evaluation),
      ...verdicts,
      coverageMode: CategoryCoverageModeDb.UNCONFIGURED,
    },
    create: buildSessionCreateData({ ...options, verdicts }),
    select: { id: true, recommendedBucketId: true },
  });

  return session;
}

function buildExplanation(
  evaluation: EvaluatedAutopilotContext
): AutopilotPreviewUiBundle['explanation'] {
  const primary = hasText(evaluation.decision.userFacingMessage)
    ? evaluation.decision.userFacingMessage
    : 'No recommendation available for this purchase.';
  const secondary: string[] = [];

  if (evaluation.recommendedCard !== null) {
    const cardLabel = hasText(evaluation.recommendedCard.nickname)
      ? evaluation.recommendedCard.nickname
      : evaluation.recommendedCard.id;
    secondary.push(`Recommended card: ${cardLabel}`);
  }
  if (
    evaluation.expectedMonetaryBenefitCents != null &&
    evaluation.expectedMonetaryBenefitCents > 0
  ) {
    secondary.push(
      `Estimated +$${(evaluation.expectedMonetaryBenefitCents / 100).toFixed(2)} vs next best option`
    );
  } else if (evaluation.expectedPointsDelta != null && evaluation.expectedPointsDelta > 0) {
    secondary.push(`Estimated +${evaluation.expectedPointsDelta} issuer points vs next best option`);
  }
  if (evaluation.bucketImpact !== null) {
    secondary.push(
      `Projected remaining: ${(evaluation.bucketImpact.remainingCents / 100).toFixed(2)}`
    );
  }

  const warnings: string[] = [];
  const degradationWarning = deriveUnresolvableCreditLiabilityWarningText(
    evaluation.decision.degradation ?? null
  );
  if (degradationWarning != null) {
    warnings.push(degradationWarning);
  }
  if (evaluation.status !== 'ok') {
    warnings.push('Autopilot could not produce a safe recommendation.');
  }
  if (evaluation.bucketImpact !== null && evaluation.bucketImpact.remainingCents <= 0) {
    warnings.push('This swipe would exhaust its bucket.');
  }

  return { primary, secondary, warnings };
}

function computeRewardStrengthLevel(
  expectedMonetaryBenefitCents: number | null,
  expectedPointsDelta: number | null,
  amountCents: number
): AutopilotPreviewUiBundle['rewardStrength']['level'] {
  if (!Number.isFinite(amountCents) || amountCents <= 0) return 1;
  if (expectedMonetaryBenefitCents != null) {
    const ratio = expectedMonetaryBenefitCents / amountCents;
    if (ratio > 0.03) return 4;
    if (ratio > 0.02) return 3;
    if (ratio > 0.01) return 2;
    return 1;
  }
  if (expectedPointsDelta != null) {
    const amountDollars = amountCents / 100;
    if (!Number.isFinite(amountDollars) || amountDollars <= 0) return 1;
    const extraPointsPerDollar = expectedPointsDelta / amountDollars;
    if (extraPointsPerDollar > 3) return 4;
    if (extraPointsPerDollar > 2) return 3;
    if (extraPointsPerDollar > 1) return 2;
  }
  return 1;
}

function assertOccurredAtNotAfterNow(occurredAt: Date, now: Date): void {
  // Invariant: authority time represents the economic event time,
  // which must never be after request-time.
  if (occurredAt.getTime() > now.getTime()) {
    throw new Error('Invariant violation: occurredAt > request now');
  }
}

async function simulateAndRecordPreviewAuthority(
  userId: string,
  evaluation: EvaluatedAutopilotContext
): Promise<AutopilotPreviewOutput['authority']> {
  const authorityResult = await simulateSpendAuthority(
    {
      userId,
      amountCents: evaluation.amountCents,
      category: evaluation.resolvedCategory,
      surface: 'autopilot',
      counterfactuals: [],
    },
    { nowMs: evaluation.occurredAt.getTime() }
  );
  const { __authorityPure: _authorityBrand, ...authorityDecision } = authorityResult.decision;
  void _authorityBrand;
  if (authorityResult.ok) {
    await recordDecisionEvent({
      userId,
      surface: 'autopilot',
      params: {
        userId,
        amountCents: evaluation.amountCents,
        category: evaluation.resolvedCategory,
        surface: 'autopilot',
        counterfactuals: [],
      },
      decision: authorityDecision,
    });
  }
  return authorityDecision;
}

function buildPreviewOutput(
  evaluation: EvaluatedAutopilotContext,
  authority: AutopilotPreviewOutput['authority']
): AutopilotPreviewOutput {
  const explanation = buildExplanation(evaluation);
  const rewardStrengthLevel = computeRewardStrengthLevel(
    evaluation.expectedMonetaryBenefitCents,
    evaluation.expectedPointsDelta,
    evaluation.amountCents
  );
  const ui = buildPreviewUiBundle({ explanation, rewardStrengthLevel });

  return {
    decisionId: evaluation.decisionId,
    merchant: evaluation.merchant,
    amountCents: evaluation.amountCents,
    occurredAt: evaluation.occurredAt.toISOString(),
    status: evaluation.status,
    recommendedCard: toRecommendedCard(evaluation.recommendedCard),
    expectedMonetaryBenefitCents: evaluation.expectedMonetaryBenefitCents,
    expectedPointsDelta: evaluation.expectedPointsDelta,
    bucketImpact: evaluation.bucketImpact,
    reasonCode: evaluation.decision.reasonCode,
    authority,
    ui,
  };
}

function validatePreviewOutput(
  preview: AutopilotPreviewOutput,
  userId: string,
  occurredAt: Date
): AutopilotPreviewOutput {
  const parsed = AutopilotPreviewOutputSchema.safeParse(preview);
  if (!parsed.success) {
    incrementCounter('autopilot_preview_invalid_output_total');
    logInvariantViolation({
      surface: 'autopilot',
      detail: 'Autopilot preview failed output validation',
      data: {
        decisionId: preview.decisionId,
        userId,
        reason: 'PREVIEW_OUTPUT_SCHEMA_MISMATCH',
        issues: parsed.error.format(),
      },
      timestamp: occurredAt.toISOString(),
    });
    throw new AutopilotServiceError('Invalid Autopilot preview output', 500, 'INVALID_PREVIEW_OUTPUT');
  }

  if (parsed.data.status === 'ok' && parsed.data.recommendedCard === null) {
    logInvariantViolation({
      surface: 'autopilot',
      detail: 'Missing recommended card for ok Autopilot preview',
      data: { decisionId: parsed.data.decisionId },
      timestamp: occurredAt.toISOString(),
    });
  }
  return parsed.data;
}

export async function getAutopilotPreview(
  world: World,
  userId: string,
  input: AutopilotPreviewEngineContext,
  options: { now: Date }
): Promise<AutopilotPreviewOutput> {
  // Preview: read-only engine wrapper (no bucket/session/ledger writes). Contract documented in docs/autopilot-master-spec.md.
  const evaluation = await evaluateAutopilot(world, userId, input, {
    timeoutMs: ENGINE_TIMEOUT_MS,
    now: options.now,
  });
  assertOccurredAtNotAfterNow(evaluation.occurredAt, options.now);
  const authorityDecision = await simulateAndRecordPreviewAuthority(userId, evaluation);

  const preview = buildPreviewOutput(evaluation, authorityDecision);
  const output = validatePreviewOutput(preview, userId, evaluation.occurredAt);

  const durationMs = 0;
  observeDuration('autopilot_preview_total_ms', durationMs, { status: output.status });

  return output;
}

async function evaluateForCommit(
  world: World,
  userId: string,
  input: AutopilotCommitInput,
  now: Date
): Promise<EvaluatedAutopilotContext> {
  return await evaluateAutopilot(
    world,
    userId,
    {
      merchant: input.merchant,
      amountCents: input.amountCents,
      occurredAt: input.occurredAt,
      category: input.category ?? ('OTHER' as AutopilotRewardCategory),
    },
    { now }
  );
}

function requireCommittableCard(
  evaluation: EvaluatedAutopilotContext,
  input: AutopilotCommitInput
): CardSummary {
  if (evaluation.decisionId !== input.decisionId) {
    throw new AutopilotServiceError('Decision fingerprint mismatch', 400, 'DECISION_MISMATCH');
  }

  if (evaluation.status !== 'ok') {
    throw new AutopilotServiceError('Autopilot could not allow this swipe', 400, 'DECISION_BLOCKED');
  }

  const recommendedCard = evaluation.recommendedCard;
  if (recommendedCard === null || recommendedCard.id !== input.cardId) {
    throw new AutopilotServiceError(
      'Card does not match the current recommendation',
      400,
      'CARD_MISMATCH'
    );
  }
  return recommendedCard;
}

async function loadFreshRuntimeBucket(
  bucketId: string | null | undefined,
  occurredAt: Date
): Promise<BucketRuntime | null> {
  const runtimeBucket =
    bucketId !== null && bucketId !== undefined
      ? await ensureBucketFresh(bucketId, occurredAt)
      : null;
  return runtimeBucket ? toBucketRuntime(runtimeBucket) : null;
}

async function confirmAutopilotSession(params: {
  sessionId: string;
  userId: string;
  evaluation: EvaluatedAutopilotContext;
  recommendedCard: CardSummary;
}): Promise<void> {
  const { sessionId, userId, evaluation, recommendedCard } = params;
  try {
    await confirmRecommendationSession({
      sessionId,
      userId,
      payload: {
        actualAmountCents: evaluation.amountCents,
        usedCardId: recommendedCard.id,
        followedRecommendation: true,
      },
      mode: 'AUTOPILOT',
      allowZeroPoints: true,
      now: evaluation.occurredAt,
      // Same transaction as the claim: a failure here no longer leaves a claimed session with a
      // ledger row but no commit row (which made every retry fail).
      inTransaction: async (tx) => {
        await tx.autopilotCommit.create({
          data: { userId, decisionId: evaluation.decisionId, sessionId },
        });
      },
    });
  } catch (error: unknown) {
    const appError = asAppError(error);
    if (error instanceof SessionConfirmError) {
      throw new AutopilotServiceError(
        error.message,
        error.status,
        'COMMIT_INVARIANT_VIOLATION',
        error.detail ?? error.code
      );
    }
    throw appError;
  }
}

export async function commitAutopilotDecisionV2(
  world: World,
  userId: string,
  input: AutopilotCommitInput,
  options: { now: Date }
): Promise<AutopilotCommitResult> {
  const evaluation = await evaluateForCommit(world, userId, input, options.now);
  const recommendedCard = requireCommittableCard(evaluation, input);

  const existingCommit = await prisma.autopilotCommit.findUnique({
    where: { userId_decisionId: { userId, decisionId: evaluation.decisionId } },
    include: { session: { select: { recommendedBucketId: true } } },
  });

  if (existingCommit !== null) {
    return {
      decisionId: evaluation.decisionId,
      sessionId: existingCommit.sessionId,
      bucket: await loadFreshRuntimeBucket(
        existingCommit.session?.recommendedBucketId,
        evaluation.occurredAt
      ),
      status: 'already_exists',
    };
  }

  const session = await findOrCreateAutopilotSession({
    evaluation,
    userId,
    resolvedCategory: evaluation.resolvedCategory,
    now: options.now,
  });

  await confirmAutopilotSession({ sessionId: session.id, userId, evaluation, recommendedCard });

  return {
    decisionId: evaluation.decisionId,
    sessionId: session.id,
    bucket: await loadFreshRuntimeBucket(session.recommendedBucketId, evaluation.occurredAt),
    status: 'created',
  };
}

type CommitBucketState = {
  bucketBefore: ReturnType<typeof computeBucketBalance> | null;
  runtimeBucket: BucketRuntime | null;
};

async function loadCommitBucketState(
  tx: Prisma.TransactionClient,
  evaluation: EvaluatedAutopilotContext,
  userId: string
): Promise<CommitBucketState> {
  const bucketDelta = evaluation.decision.bucketDelta;
  if (bucketDelta === null) {
    return { bucketBefore: null, runtimeBucket: null };
  }

  const freshBucket = await ensureBucketFresh(bucketDelta.bucketId, evaluation.occurredAt, tx);
  if (freshBucket !== null && freshBucket.userId === userId) {
    return {
      bucketBefore: computeBucketBalance(freshBucket),
      runtimeBucket: toBucketRuntime(freshBucket),
    };
  }

  logInvariantViolation({
    surface: 'autopilot',
    detail: 'Bucket delta referenced missing or foreign bucket',
    data: { bucketId: bucketDelta.bucketId, userId },
    timestamp: evaluation.occurredAt.toISOString(),
  });
  return { bucketBefore: null, runtimeBucket: null };
}

function buildSimulatedTransactionBucketFields(
  evaluation: EvaluatedAutopilotContext,
  { bucketBefore, runtimeBucket }: CommitBucketState
) {
  return {
    bucketId: runtimeBucket?.id ?? evaluation.decision.bucketDelta?.bucketId ?? null,
    bucketName: runtimeBucket?.name ?? evaluation.bucketName ?? null,
    bucketPeriod: runtimeBucket?.period ?? null,
    bucketBeforeCents: bucketBefore?.remainingCents ?? null,
    bucketAfterCents: evaluation.decision.bucketDelta?.newRemainingCents ?? null,
    bucketLimitCents: runtimeBucket?.budgetAmount ?? null,
  };
}

function resolveCommitCardLabel(recommendedCard: CardSummary, fallbackCardId: string): string {
  return hasText(recommendedCard.nickname)
    ? recommendedCard.nickname
    : recommendedCard.id ?? fallbackCardId;
}

async function findExistingSimulatedCommit(
  tx: Prisma.TransactionClient,
  evaluation: EvaluatedAutopilotContext
) {
  const existing = await tx.simulatedTransaction.findUnique({
    where: { id: evaluation.decisionId },
  });
  if (existing === null) return null;

  const bucket =
    typeof existing.bucketId === 'string'
      ? await ensureBucketFresh(existing.bucketId, evaluation.occurredAt, tx)
      : null;
  return {
    status: 'already_exists' as const,
    transactionId: existing.id,
    bucket: bucket ? toBucketRuntime(bucket) : null,
  };
}

export async function commitAutopilotDecision(
  world: World,
  userId: string,
  input: AutopilotCommitInput,
  options: { now: Date }
): Promise<AutopilotCommitResult> {
  const evaluation = await evaluateForCommit(world, userId, input, options.now);
  const recommendedCard = requireCommittableCard(evaluation, input);
  const cardLabel = resolveCommitCardLabel(recommendedCard, input.cardId);

  const commitResult = await prisma.$transaction(async (tx) => {
    const existing = await findExistingSimulatedCommit(tx, evaluation);
    if (existing !== null) return existing;

    const bucketState = await loadCommitBucketState(tx, evaluation, userId);

    const transaction = await tx.simulatedTransaction.create({
      data: {
        id: evaluation.decisionId,
        userId,
        amount: evaluation.amountCents,
        merchantName: evaluation.merchant,
        resolvedCategory: evaluation.resolvedCategory,
        ...buildSimulatedTransactionBucketFields(evaluation, bucketState),
        chosenCardId: recommendedCard.id,
        chosenCardName: cardLabel,
        status: TransactionStatus.APPROVED,
        reason: 'AUTOPILOT_COMMIT',
        strictDecline: false,
      },
    });

    return {
      status: 'created' as const,
      transactionId: transaction.id,
      bucket: bucketState.runtimeBucket,
    };
  });

  return {
    decisionId: evaluation.decisionId,
    transactionId: commitResult.transactionId,
    bucket: commitResult.bucket,
    status: commitResult.status,
  };
}
