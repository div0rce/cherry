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
  RewardCategory,
} from '@prisma/client';
import type { AutopilotDecision } from '@/lib/engine/public-types';
import { getAutopilotDecisionForUserSwipe as runEngineAutopilot } from '@/lib/engine/public';
import { logInvariantViolation } from '@/lib/log';
import { prisma } from '@/lib/prisma';
import { simulateSpendAuthority, recordDecisionEvent } from '@/lib/authority/simulateSpendAuthority';
import { resolveScanCategory } from '@/lib/scan-helpers';
import { ensureBucketFresh } from '@/lib/buckets/ensure-fresh';
import {
  computeBucketBalance,
  computeBucketBalanceFromNumbers,
  deriveLegacyCurrentAmount,
  toBucketRuntime,
  type BucketRuntime,
} from '@/lib/buckets-runtime';
import { hasText } from '@/lib/text';
import type {
  AutopilotCommitInput,
  AutopilotCommitResult,
  AutopilotDecisionStatus,
  AutopilotRecommendedCard,
  AutopilotRewardCategory,
} from './types';
import { AutopilotServiceError } from './types';
import { getAutopilotUiSpec } from '@/lib/autopilot/uiSpec';
import type {
  AutopilotPreviewOutput,
  AutopilotPreviewUiBundle,
} from '@/lib/validation/autopilot/preview';
import { AutopilotPreviewOutputSchema } from '@/lib/validation/autopilot/preview';
import { incrementCounter, observeDuration } from '@/lib/metrics/autopilot';
import { confirmRecommendationSession, SessionConfirmError } from '@/lib/sessions/confirm-service';
import {
  buildAutopilotStateSnapshot,
  buildAutopilotStateSnapshotHash,
  computeEngineDecisionIdV1,
} from '@/lib/autopilot/engineDecisionId';

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
  expectedBenefitCents: number;
  bucketImpact: AutopilotPreviewOutput['bucketImpact'];
  bucketName: string | null;
  recommendedCard: CardSummary | null;
  cards: CardSummary[];
  stateSnapshotHash: string;
};

const ENGINE_TIMEOUT_MS = 1500;

function parseOccurredAt(raw?: string): Date {
  if (raw === undefined) return new Date();
  const date = new Date(raw);
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
  if (!card) return null;
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
      recommendation: 'Autopilot recommendation',
      alternatives: 'Other ways to pay',
      monthImpactTitle: 'Month impact',
    },
    ctas: {
      primaryTemplate: 'Use ${cardName} for this purchase',
      secondary: 'View bucket impact',
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
      if (timer) {
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
  if (!bucketDelta) return null;

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

async function evaluateAutopilot(
  userId: string,
  input: AutopilotPreviewEngineContext,
  options: { timeoutMs?: number } = {}
): Promise<EvaluatedAutopilotContext> {
  if (!hasText(userId)) {
    throw new AutopilotServiceError('User is required', 400, 'INVALID_USER');
  }

  const merchant = input.merchant.trim();
  if (!hasText(merchant)) {
    throw new AutopilotServiceError('Merchant is required', 400, 'INVALID_MERCHANT');
  }

  const resolvedCategory: RewardCategory = await resolveScanCategory({
    userId,
    merchantName: merchant,
    mccCode: null,
    explicitCategory: input.category ?? null,
  });

  const amountCents = Math.round(input.amountCents);
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    throw new AutopilotServiceError('Amount must be positive', 400, 'INVALID_AMOUNT');
  }

  const occurredAt = parseOccurredAt(input.occurredAt);

  const cards = await prisma.card.findMany({
    where: { userId },
    select: { id: true, nickname: true, issuer: true, network: true, isCredit: true },
    orderBy: { createdAt: 'asc' },
  });
  const cardUniverseIds = cards.map((card) => card.id);

  let decision: AutopilotDecision;
  try {
    const engineCall = runEngineAutopilot({
      userId,
      merchant,
      amountCents,
      cardUniverseIds,
    });
    decision =
      typeof options.timeoutMs === 'number'
        ? await withTimeout(engineCall, options.timeoutMs, 'ENGINE_TIMEOUT')
        : await engineCall;
  } catch (error) {
    if (error instanceof AutopilotServiceError) {
      throw error;
    }
    throw new AutopilotServiceError(
      'Unable to evaluate Autopilot right now',
      500,
      'ENGINE_ERROR',
      error instanceof Error ? error.message : 'UNKNOWN_ENGINE_ERROR'
    );
  }

  const status = mapKindToStatus(decision.kind);
  const recommendedCard =
    decision.cardId !== null ? cards.find((card) => card.id === decision.cardId) ?? null : null;

  const bucketImpact = await buildBucketImpact(decision.bucketDelta, userId);
  const expectedBenefitCents = Math.max(0, decision.expectedMonetaryBenefitCents ?? 0);
  const stateSnapshot = await buildAutopilotStateSnapshot({
    userId,
    category: resolvedCategory,
    effectiveAt: occurredAt,
    cards,
  });
  const stateSnapshotHash = buildAutopilotStateSnapshotHash(stateSnapshot);
  let engineDecisionId: string;
  try {
    engineDecisionId = computeEngineDecisionIdV1({
      userId,
      source: RecommendationSource.AUTOPILOT,
      amountCents,
      currency: 'USD',
      merchantName: merchant,
      category: resolvedCategory,
      effectiveAt: occurredAt,
      stateSnapshotHash,
    });
  } catch (error) {
    throw new AutopilotServiceError(
      'Unable to build decision fingerprint',
      400,
      'INVALID_IDEMPOTENCY',
      error instanceof Error ? error.message : 'INVALID_ID'
    );
  }

  if (!engineDecisionId.startsWith('edid_v1_')) {
    logInvariantViolation({
      surface: 'autopilot',
      detail: 'Unexpected engineDecisionId prefix',
      data: { engineDecisionId },
    });
  }

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
    expectedBenefitCents,
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

async function findOrCreateAutopilotSession(options: {
  evaluation: EvaluatedAutopilotContext;
  userId: string;
  resolvedCategory: RewardCategory;
}): Promise<{ id: string; recommendedBucketId: string | null }> {
  const { evaluation, userId, resolvedCategory } = options;

  const budgetVerdict = deriveBudgetVerdict(evaluation.bucketImpact);
  const overallVerdict = deriveOverallVerdict(evaluation.status, budgetVerdict);
  const cardVerdict =
    evaluation.recommendedCard === null ? CardVerdict.NO_CARD_DATA : CardVerdict.OPTIMAL;

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
      recommendedCardId: evaluation.recommendedCard?.id ?? null,
      recommendedBucketId: evaluation.decision.bucketDelta?.bucketId ?? null,
      budgetVerdict,
      cardVerdict,
      overallVerdict,
      coverageMode: CategoryCoverageModeDb.UNCONFIGURED,
    },
    create: {
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
      recommendedCardId: evaluation.recommendedCard?.id ?? null,
      recommendedBucketId: evaluation.decision.bucketDelta?.bucketId ?? null,
      confirmedAmountCents: null,
      bucketSpendReversed: false,
      verdict:
        budgetVerdict === BudgetVerdict.BREAKS_BUDGET
          ? RecommendationVerdict.BREAKS_BUDGET
          : RecommendationVerdict.HEALTHY,
      cherryPointsOffered: 0,
      status: RecommendationStatus.RECOMMENDED,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      verifiedAt: null,
      rejectedAt: null,
      budgetVerdict,
      cardVerdict,
      overallVerdict,
      coverageMode: CategoryCoverageModeDb.UNCONFIGURED,
      verificationStatus: VerificationStatus.UNVERIFIED,
      anomalyCode: SessionAnomalyCode.NONE,
      anomalyDetails: null,
    },
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

  if (evaluation.recommendedCard) {
    const cardLabel = hasText(evaluation.recommendedCard.nickname)
      ? evaluation.recommendedCard.nickname
      : evaluation.recommendedCard.id;
    secondary.push(`Recommended card: ${cardLabel}`);
  }
  if (evaluation.expectedBenefitCents > 0) {
    secondary.push(
      `Estimated +$${(evaluation.expectedBenefitCents / 100).toFixed(2)} vs next best option`
    );
  }
  if (evaluation.bucketImpact) {
    secondary.push(
      `Projected remaining: ${(evaluation.bucketImpact.remainingCents / 100).toFixed(2)}`
    );
  }

  const warnings: string[] = [];
  if (evaluation.status !== 'ok') {
    warnings.push('Autopilot could not produce a safe recommendation.');
  }
  if (evaluation.bucketImpact && evaluation.bucketImpact.remainingCents <= 0) {
    warnings.push('This swipe would exhaust its bucket.');
  }

  return { primary, secondary, warnings };
}

function computeRewardStrengthLevel(
  expectedBenefitCents: number,
  amountCents: number
): AutopilotPreviewUiBundle['rewardStrength']['level'] {
  if (!Number.isFinite(amountCents) || amountCents <= 0) return 1;
  const ratio = expectedBenefitCents / amountCents;
  if (ratio > 0.03) return 4;
  if (ratio > 0.02) return 3;
  if (ratio > 0.01) return 2;
  return 1;
}

export async function getAutopilotPreview(
  userId: string,
  input: AutopilotPreviewEngineContext
): Promise<AutopilotPreviewOutput> {
  // Preview: read-only engine wrapper (no bucket/session/ledger writes). Contract documented in docs/autopilot-master-spec.md.
  const startedAt = Date.now();
  const evaluation = await evaluateAutopilot(userId, input, { timeoutMs: ENGINE_TIMEOUT_MS });
  const authorityDecision = await simulateSpendAuthority({
    userId,
    amountCents: evaluation.amountCents,
    category: evaluation.resolvedCategory,
    surface: 'autopilot',
    counterfactuals: [],
  });
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

  const explanation = buildExplanation(evaluation);
  const rewardStrengthLevel = computeRewardStrengthLevel(
    evaluation.expectedBenefitCents,
    evaluation.amountCents
  );
  const ui = buildPreviewUiBundle({ explanation, rewardStrengthLevel });

  const preview: AutopilotPreviewOutput = {
    decisionId: evaluation.decisionId,
    merchant: evaluation.merchant,
    amountCents: evaluation.amountCents,
    occurredAt: evaluation.occurredAt.toISOString(),
    status: evaluation.status,
    recommendedCard: toRecommendedCard(evaluation.recommendedCard),
    expectedBenefitCents: evaluation.expectedBenefitCents,
    bucketImpact: evaluation.bucketImpact,
    reasonCode: evaluation.decision.reasonCode,
    authority: authorityDecision,
    ui,
  };

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
    });
    throw new AutopilotServiceError('Invalid Autopilot preview output', 500, 'INVALID_PREVIEW_OUTPUT');
  }

  if (parsed.data.status === 'ok' && parsed.data.recommendedCard === null) {
    logInvariantViolation({
      surface: 'autopilot',
      detail: 'Missing recommended card for ok Autopilot preview',
      data: { decisionId: parsed.data.decisionId },
    });
  }

  const durationMs = Date.now() - startedAt;
  observeDuration('autopilot_preview_total_ms', durationMs, { status: parsed.data.status });

  return parsed.data;
}

export async function commitAutopilotDecisionV2(
  userId: string,
  input: AutopilotCommitInput
): Promise<AutopilotCommitResult> {
  const evaluation = await evaluateAutopilot(userId, {
    merchant: input.merchant,
    amountCents: input.amountCents,
    occurredAt: input.occurredAt,
    category: input.category ?? ('OTHER' as AutopilotRewardCategory),
  });

  if (evaluation.decisionId !== input.decisionId) {
    throw new AutopilotServiceError('Decision fingerprint mismatch', 400, 'DECISION_MISMATCH');
  }

  if (evaluation.status !== 'ok') {
    throw new AutopilotServiceError('Autopilot could not approve this swipe', 400, 'DECISION_BLOCKED');
  }

  const recommendedCard = evaluation.recommendedCard;
  if (recommendedCard === null) {
    throw new AutopilotServiceError(
      'Card does not match the current recommendation',
      400,
      'CARD_MISMATCH'
    );
  }

  if (recommendedCard.id !== input.cardId) {
    throw new AutopilotServiceError(
      'Card does not match the current recommendation',
      400,
      'CARD_MISMATCH'
    );
  }

  const existingCommit = await prisma.autopilotCommit.findUnique({
    where: { userId_decisionId: { userId, decisionId: evaluation.decisionId } },
    include: { session: { select: { recommendedBucketId: true } } },
  });

  if (existingCommit) {
    const runtimeBucket =
      existingCommit.session?.recommendedBucketId !== null &&
      existingCommit.session?.recommendedBucketId !== undefined
        ? await ensureBucketFresh(existingCommit.session.recommendedBucketId, evaluation.occurredAt)
        : null;
    return {
      decisionId: evaluation.decisionId,
      sessionId: existingCommit.sessionId,
      bucket: runtimeBucket ? toBucketRuntime(runtimeBucket) : null,
      status: 'already_exists',
    };
  }

  const session = await findOrCreateAutopilotSession({
    evaluation,
    userId,
    resolvedCategory: evaluation.resolvedCategory,
  });

  try {
    await confirmRecommendationSession({
      sessionId: session.id,
      userId,
      payload: {
        actualAmountCents: evaluation.amountCents,
        usedCardId: recommendedCard.id,
        followedRecommendation: true,
      },
      mode: 'AUTOPILOT',
      allowZeroPoints: true,
      now: evaluation.occurredAt,
    });
  } catch (error) {
    if (error instanceof SessionConfirmError) {
      throw new AutopilotServiceError(
        error.message,
        error.status,
        'COMMIT_INVARIANT_VIOLATION',
        error.detail ?? error.code
      );
    }
    throw error;
  }

  const createdCommit = await prisma.autopilotCommit.create({
    data: {
      userId,
      decisionId: evaluation.decisionId,
      sessionId: session.id,
    },
  });

  const runtimeBucket =
    session.recommendedBucketId !== null
      ? await ensureBucketFresh(session.recommendedBucketId, evaluation.occurredAt)
      : null;

  return {
    decisionId: createdCommit.decisionId,
    sessionId: session.id,
    bucket: runtimeBucket ? toBucketRuntime(runtimeBucket) : null,
    status: 'created',
  };
}

export async function commitAutopilotDecision(
  userId: string,
  input: AutopilotCommitInput
): Promise<AutopilotCommitResult> {
  const evaluation = await evaluateAutopilot(userId, {
    merchant: input.merchant,
    amountCents: input.amountCents,
    occurredAt: input.occurredAt,
    category: input.category ?? ('OTHER' as AutopilotRewardCategory),
  });

  if (evaluation.decisionId !== input.decisionId) {
    throw new AutopilotServiceError('Decision fingerprint mismatch', 400, 'DECISION_MISMATCH');
  }

  if (evaluation.status !== 'ok') {
    throw new AutopilotServiceError('Autopilot could not approve this swipe', 400, 'DECISION_BLOCKED');
  }

  const recommendedCard = evaluation.recommendedCard;
  if (recommendedCard === null) {
    throw new AutopilotServiceError(
      'Card does not match the current recommendation',
      400,
      'CARD_MISMATCH'
    );
  }

  if (recommendedCard.id !== input.cardId) {
    throw new AutopilotServiceError(
      'Card does not match the current recommendation',
      400,
      'CARD_MISMATCH'
    );
  }

  const cardLabel = hasText(recommendedCard.nickname)
    ? recommendedCard.nickname
    : recommendedCard.id ?? input.cardId;

  const commitResult = await prisma.$transaction(async (tx) => {
    const existing = await tx.simulatedTransaction.findUnique({
      where: { id: evaluation.decisionId },
    });

    if (existing) {
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

    let bucketBefore: ReturnType<typeof computeBucketBalance> | null = null;
    let bucketAfter: ReturnType<typeof computeBucketBalance> | null = null;
    let runtimeBucket: BucketRuntime | null = null;

    if (evaluation.decision.bucketDelta) {
      const freshBucket = await ensureBucketFresh(
        evaluation.decision.bucketDelta.bucketId,
        evaluation.occurredAt,
        tx
      );

      if (freshBucket && freshBucket.userId === userId) {
        bucketBefore = computeBucketBalance(freshBucket);
        const delta = evaluation.decision.bucketDelta.newSpentCents - bucketBefore.committedCents;

        if (delta > 0) {
          const newSpent = freshBucket.spentCents + delta;
          const balanceAfter = computeBucketBalanceFromNumbers(freshBucket.budgetAmount, newSpent, 0);
          const persisted = await tx.bucket.update({
            where: { id: freshBucket.id, userId },
            data: {
              spentCents: newSpent,
              currentAmount: deriveLegacyCurrentAmount(balanceAfter),
            },
          });
          runtimeBucket = toBucketRuntime(persisted);
          bucketAfter = balanceAfter;
        } else {
          runtimeBucket = toBucketRuntime(freshBucket);
          bucketAfter = bucketBefore;
        }
      } else {
        logInvariantViolation({
          surface: 'autopilot',
          detail: 'Bucket delta referenced missing or foreign bucket',
          data: { bucketId: evaluation.decision.bucketDelta.bucketId, userId },
        });
      }
    }

    const transaction = await tx.simulatedTransaction.create({
      data: {
        id: evaluation.decisionId,
        userId,
        amount: evaluation.amountCents,
        merchantName: evaluation.merchant,
        resolvedCategory: evaluation.resolvedCategory,
        bucketId: runtimeBucket?.id ?? evaluation.decision.bucketDelta?.bucketId ?? null,
        bucketName: runtimeBucket?.name ?? evaluation.bucketName ?? null,
        bucketPeriod: runtimeBucket?.period ?? null,
        bucketBeforeCents: bucketBefore?.remainingCents ?? null,
        bucketAfterCents: bucketAfter?.remainingCents ?? null,
        bucketLimitCents: runtimeBucket?.budgetAmount ?? null,
        chosenCardId: recommendedCard.id,
        chosenCardName: cardLabel,
        status: TransactionStatus.APPROVED,
        reason: 'AUTOPILOT_COMMIT',
        strictDecline: false,
      },
    });

    return { status: 'created' as const, transactionId: transaction.id, bucket: runtimeBucket };
  });

  return {
    decisionId: evaluation.decisionId,
    transactionId: commitResult.transactionId,
    bucket: commitResult.bucket,
    status: commitResult.status,
  };
}
