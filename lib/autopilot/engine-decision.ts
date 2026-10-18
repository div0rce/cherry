// Autopilot's swipe entry point: loads the user's engine state through the Prisma-backed
// lib/engine-state.ts, then runs the pure solver. It lives outside lib/engine so the engine barrel
// stays free of Prisma.
import type { RewardCategory } from '../enums.js';
import { hasText } from '../text.js';
import { isPositiveNumber } from '../numbers.js';
import { resolveScanCategory } from '../scan-helpers.js';
import { buildEngineContext } from '../engine/context.js';
import { fromPrismaUserToEngineState } from '../engine-state.js';
import { safeSolveDecisionForWorld } from '../engine/run.js';
import type { EngineDecision, EngineState } from '../engine/types.js';
import type { AutopilotDecision, AutopilotDecisionKind, SwipeInput } from '../engine/public-types.js';
import type { World } from '../adapters/world.js';
import { getRewardSemanticsForCardSpend } from '../engine/reward-semantics.js';
import {
  deriveEngineDegradation,
  deriveUnresolvableCreditLiabilityWarningText,
  type EngineDegradation,
} from '../engine/degradation.js';

const SUPPORTED_ACTIONS: EngineDecision['action']['type'][] = ['USE_CARD', 'USE_CARD_WITH_PAYDOWN'];

function normalizeCardUniverseIds(cardUniverseIds: string[]): string[] {
  const unique = new Set(
    cardUniverseIds
      .filter((id) => hasText(id))
      .map((id) => id.trim())
      .filter((id) => id.length > 0)
  );
  return Array.from(unique);
}

function selectCardDecisions(
  decisions: EngineDecision[],
  allowedCardIds: string[]
): EngineDecision[] {
  const filtered = decisions.filter((decision) => {
    const { action } = decision;
    if (!SUPPORTED_ACTIONS.includes(action.type)) return false;
    if (!hasText(action.cardId)) return false;
    return allowedCardIds.includes(action.cardId);
  });

  return filtered.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const cardA = a.action.cardId == null ? '' : a.action.cardId;
    const cardB = b.action.cardId == null ? '' : b.action.cardId;
    return cardA.localeCompare(cardB);
  });
}

function pickBucketDelta(decision: EngineDecision, state: EngineState): AutopilotDecision['bucketDelta'] {
  for (const projection of decision.projections.buckets) {
    const bucket = state.buckets.find((candidate) => candidate.id === projection.bucketId);
    if (bucket === undefined) continue;

    const committedChanged = projection.projectedCommittedCents !== bucket.committedCents;
    if (committedChanged) {
      return {
        bucketId: bucket.id,
        newSpentCents: projection.projectedCommittedCents,
        newRemainingCents: projection.projectedRemainingCents,
      };
    }
  }
  return null;
}

function estimateRewardSignals(
  decision: EngineDecision,
  state: EngineState,
  amountCents: number,
  merchantCategoryKey: RewardCategory | null
): { rewardValueCents: number | null; rewardPoints: number | null } {
  const cardId = decision.action.cardId;
  if (!hasText(cardId)) {
    return { rewardValueCents: null, rewardPoints: null };
  }
  const card = state.cards.find((candidate) => candidate.id === cardId);
  if (card === undefined) {
    return { rewardValueCents: null, rewardPoints: null };
  }

  const rewardSemantics = getRewardSemanticsForCardSpend({
    card,
    amountCents,
    merchantCategoryKey,
  });
  if (rewardSemantics === null) {
    return { rewardValueCents: null, rewardPoints: null };
  }

  return {
    rewardValueCents: rewardSemantics.rewardValueCents,
    rewardPoints: rewardSemantics.rewardPoints,
  };
}

function classifyReasonCode(decision: EngineDecision, bucketDelta: AutopilotDecision['bucketDelta']): string {
  const softBreaches = decision.constraintsBreached.some((constraint) =>
    constraint.startsWith('SOFT:')
  );
  let hasBudgetTension = softBreaches;
  if (hasBudgetTension === false) {
    const remaining =
      bucketDelta !== null && bucketDelta.newRemainingCents != null
        ? bucketDelta.newRemainingCents
        : null;
    if (remaining != null && remaining <= 0) {
      hasBudgetTension = true;
    }
  }

  if (decision.action.type === 'USE_CARD_WITH_PAYDOWN') {
    return 'PAYDOWN_RECOMMENDED';
  }
  if (hasBudgetTension === true) {
    return 'PROTECT_BUDGET';
  }
  return 'MAX_REWARDS';
}

const BLOCKED_MESSAGE = 'This purchase would break your guardrails. We recommend skipping it.';
const FALLBACK_MESSAGE = 'We could not compute a safe recommendation. Use your usual card.';

function benefitMessagePart(benefitCents: number | null, pointsDelta: number | null): string | null {
  if (benefitCents != null && benefitCents > 0) {
    return `about $${formatCentsAsDollars(benefitCents)} better than your next best card`;
  }
  if (pointsDelta != null && pointsDelta > 0) {
    return `for about ${pointsDelta} higher issuer points than your next best card`;
  }
  return null;
}

function bucketMessagePart(bucketName: string | null, bucketRemainingCents: number | null): string | null {
  if (bucketRemainingCents == null) return null;
  const remainingDollars = formatCentsAsDollars(bucketRemainingCents);
  const bucketLabel = bucketName == null ? 'your budget' : bucketName;
  return `keeps ${bucketLabel} on track ($${remainingDollars} left)`;
}

function renderUserFacingMessage(params: {
  kind: AutopilotDecisionKind;
  cardLabel: string | null;
  benefitCents: number | null;
  pointsDelta: number | null;
  bucketName: string | null;
  bucketRemainingCents: number | null;
}): string {
  const { kind, cardLabel, benefitCents, pointsDelta, bucketName, bucketRemainingCents } = params;

  if (kind === 'BLOCKED') return BLOCKED_MESSAGE;
  if (kind === 'FALLBACK') return FALLBACK_MESSAGE;

  const label = hasText(cardLabel) ? cardLabel : 'this card';
  const parts: string[] = [`Use ${label}`];
  for (const part of [
    benefitMessagePart(benefitCents, pointsDelta),
    bucketMessagePart(bucketName, bucketRemainingCents),
  ]) {
    if (part !== null) parts.push(part);
  }

  return `${parts.join(' – ')}.`;
}

function valueOrZero(value: number | null): number {
  return value != null ? value : 0;
}

function formatCentsAsDollars(cents: number): string {
  const centsPerDollar = 100;
  return (cents / centsPerDollar).toFixed(2);
}

function nonOkDecision(
  kind: 'FALLBACK' | 'BLOCKED',
  reasonCode: string,
  options: { degradation?: EngineDegradation; userFacingMessage?: string | null } = {}
): AutopilotDecision {
  const defaultMessage = kind === 'BLOCKED' ? BLOCKED_MESSAGE : FALLBACK_MESSAGE;
  const userFacingMessage = options.userFacingMessage;
  const degradation = options.degradation;
  return {
    kind,
    cardId: null,
    reasonCode,
    userFacingMessage: userFacingMessage != null ? userFacingMessage : defaultMessage,
    expectedMonetaryBenefitCents: null,
    expectedPointsDelta: null,
    bucketDelta: null,
    degradation: degradation !== undefined ? degradation : null,
  };
}

function fallbackDecision(
  reasonCode: string,
  options: { degradation?: EngineDegradation; userFacingMessage?: string | null } = {}
): AutopilotDecision {
  return nonOkDecision('FALLBACK', reasonCode, options);
}

function blockedDecision(reasonCode: string): AutopilotDecision {
  return nonOkDecision('BLOCKED', reasonCode);
}

function isMissingTime(nowMs: number | null | undefined): boolean {
  if (nowMs == null) return true;
  return Number.isNaN(nowMs);
}

function assertValidSwipe(input: SwipeInput, normalizedMerchant: string): void {
  const { userId, amountCents, nowMs } = input;
  const checks: ReadonlyArray<readonly [() => boolean, string]> = [
    [() => isMissingTime(nowMs), 'Autopilot: nowMs required'],
    [() => !hasText(userId), 'Autopilot: userId required'],
    [() => !hasText(normalizedMerchant), 'Autopilot: merchant required'],
    [() => !isPositiveNumber(amountCents), 'Autopilot: positive amount required'],
  ];
  for (const [isInvalid, message] of checks) {
    if (isInvalid()) throw new Error(message);
  }
}

async function resolveMerchantCategory(
  userId: string,
  merchantName: string
): Promise<RewardCategory | null> {
  try {
    return await resolveScanCategory({
      userId,
      merchantName,
      mccCode: null,
      explicitCategory: null,
    });
  } catch (error: unknown) {
    void error;
    return null;
  }
}

function noEligibleDecision(degradation: EngineDegradation): AutopilotDecision {
  const warning = deriveUnresolvableCreditLiabilityWarningText(degradation);
  if (warning == null) return blockedDecision('NO_ELIGIBLE_DECISION');
  const reasonCode = degradation !== null ? degradation.code : 'NO_ELIGIBLE_DECISION';
  return fallbackDecision(reasonCode, { degradation, userFacingMessage: warning });
}

function findBucketName(state: EngineState, bucketDelta: AutopilotDecision['bucketDelta']): string | null {
  if (bucketDelta === null) return null;
  const matched = state.buckets.find((bucket) => bucket.id === bucketDelta.bucketId);
  return matched && matched.name != null ? matched.name : null;
}

function positiveDelta(best: number | null, runnerUp: number | null): number | null {
  return best != null ? Math.max(0, best - valueOrZero(runnerUp)) : null;
}

function resolveCardLabel(state: EngineState, cardId: string | undefined): string | null {
  const matchedCard = state.cards.find((card) => card.id === cardId);
  if (matchedCard !== undefined && matchedCard.label != null) return matchedCard.label;
  return cardId != null ? cardId : null;
}

type OkDecisionInput = {
  bestDecision: EngineDecision;
  runnerUp: EngineDecision | undefined;
  state: EngineState;
  amountCents: number;
  merchantCategoryKey: RewardCategory | null;
  degradation: EngineDegradation;
};

function buildOkDecision(input: OkDecisionInput): AutopilotDecision {
  const { bestDecision, runnerUp, state, amountCents, merchantCategoryKey, degradation } = input;
  const bucketDelta = pickBucketDelta(bestDecision, state);
  const bucketName = findBucketName(state, bucketDelta);

  const expectedBest = estimateRewardSignals(bestDecision, state, amountCents, merchantCategoryKey);
  const expectedRunnerUp =
    runnerUp != null
      ? estimateRewardSignals(runnerUp, state, amountCents, merchantCategoryKey)
      : { rewardValueCents: null, rewardPoints: null };
  const expectedMonetaryBenefitCents = positiveDelta(
    expectedBest.rewardValueCents,
    expectedRunnerUp.rewardValueCents
  );
  const expectedPointsDelta = positiveDelta(expectedBest.rewardPoints, expectedRunnerUp.rewardPoints);

  const reasonCode = classifyReasonCode(bestDecision, bucketDelta);
  const cardId = bestDecision.action.cardId;
  const userFacingMessage = renderUserFacingMessage({
    kind: 'OK',
    cardLabel: resolveCardLabel(state, cardId),
    benefitCents: expectedMonetaryBenefitCents,
    pointsDelta: expectedPointsDelta,
    bucketName,
    bucketRemainingCents:
      bucketDelta && bucketDelta.newRemainingCents != null ? bucketDelta.newRemainingCents : null,
  });

  return {
    kind: 'OK',
    cardId: cardId == null ? null : cardId,
    reasonCode,
    userFacingMessage,
    expectedMonetaryBenefitCents,
    expectedPointsDelta,
    bucketDelta,
    degradation,
  };
}

type SolveResult = Awaited<ReturnType<typeof safeSolveDecisionForWorld>>;

function decideFromEngineResult(
  engineResult: SolveResult,
  cardUniverseIds: string[],
  swipe: { amountCents: number; merchantCategoryKey: RewardCategory | null }
): AutopilotDecision {
  if (engineResult.ok !== true) {
    return fallbackDecision('FALLBACK_SAFE');
  }
  const degradation = deriveEngineDegradation(engineResult.exclusions);

  const sortedCardDecisions = selectCardDecisions(engineResult.decisions, cardUniverseIds);
  if (sortedCardDecisions.length === 0) {
    return noEligibleDecision(degradation);
  }

  const [bestDecision, runnerUp] = sortedCardDecisions;
  if (bestDecision === undefined) {
    return blockedDecision('NO_ELIGIBLE_DECISION');
  }
  if (!hasText(bestDecision.action.cardId)) {
    return fallbackDecision('MISSING_CARD_ID');
  }

  return buildOkDecision({
    bestDecision,
    runnerUp,
    state: engineResult.state,
    amountCents: swipe.amountCents,
    merchantCategoryKey: swipe.merchantCategoryKey,
    degradation,
  });
}

function isAllowedCardAction(action: EngineDecision['action'], cardUniverseIds: string[]): boolean {
  if (!SUPPORTED_ACTIONS.includes(action.type)) return false;
  return action.cardId == null ? false : cardUniverseIds.includes(action.cardId);
}

export async function getAutopilotDecisionForUserSwipe(
  world: World,
  input: SwipeInput
): Promise<AutopilotDecision> {
  const { userId, merchant, amountCents, nowMs } = input;
  const normalizedMerchant = merchant.trim();
  assertValidSwipe(input, normalizedMerchant);

  const cardUniverseIds = normalizeCardUniverseIds(
    input.cardUniverseIds == null ? [] : input.cardUniverseIds
  );
  if (cardUniverseIds.length === 0) {
    return fallbackDecision('NO_CARDS_AVAILABLE');
  }

  const state = await fromPrismaUserToEngineState(userId, nowMs);
  const allowedCards = state.cards.filter((card) => cardUniverseIds.includes(card.id));
  if (allowedCards.length === 0) {
    return fallbackDecision('NO_MATCHING_CARDS');
  }

  const filteredState: EngineState = { ...state, cards: allowedCards };
  const merchantCategoryKey = await resolveMerchantCategory(userId, normalizedMerchant);

  const ctx = buildEngineContext({
    surface: 'web',
    nowMs,
    merchantName: normalizedMerchant,
    merchantCategoryKey,
    mcc: null,
    amountCents,
  });

  const engineResult = await safeSolveDecisionForWorld(world, userId, ctx, {
    maxCandidates: 64,
    stateOverride: filteredState,
    includeLegacyDecision: false,
    candidateFilter: (action) => isAllowedCardAction(action, cardUniverseIds),
  });

  return decideFromEngineResult(engineResult, cardUniverseIds, { amountCents, merchantCategoryKey });
}
