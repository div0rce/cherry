import type { RewardCategory } from '../enums.js';
import { hasText } from '../text.js';
import { isPositiveNumber } from '../numbers.js';
import { resolveScanCategory } from '../scan-helpers.js';
import { buildEngineContext } from './context.js';
import { fromPrismaUserToEngineState } from '../engine-state.js';
import { safeSolveDecisionForWorld } from './run.js';
import type { EngineDecision, EngineState } from './types.js';
import type { AutopilotDecision, AutopilotDecisionKind, SwipeInput } from './public-types.js';
import type { World } from '../adapters/world.js';

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
    if (!bucket) continue;

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

function estimateBenefitCents(
  decision: EngineDecision,
  state: EngineState,
  amountCents: number,
  merchantCategoryKey: RewardCategory | null
): number {
  const cardId = decision.action.cardId;
  if (!hasText(cardId)) return 0;
  const card = state.cards.find((candidate) => candidate.id === cardId);
  if (!card) return 0;

  const category = merchantCategoryKey == null ? 'OTHER' : merchantCategoryKey;
  let rewardRule = card.rewardRules.find((rule) => rule.categoryKey === category);
  if (!rewardRule) {
    rewardRule = card.rewardRules.find((rule) => rule.categoryKey === 'GENERAL_MERCHANDISE');
  }
  if (!rewardRule) {
    rewardRule = card.rewardRules.find((rule) => rule.categoryKey === 'OTHER');
  }

  if (!rewardRule) return 0;

  if (rewardRule.rateType === 'CASHBACK') {
    const estimated = Math.floor(amountCents * rewardRule.rateValue);
    return estimated > 0 ? estimated : 0;
  }

  const estimatedPoints = Math.floor((amountCents / 100) * rewardRule.rateValue);
  return estimatedPoints > 0 ? estimatedPoints : 0;
}

function classifyReasonCode(decision: EngineDecision, bucketDelta: AutopilotDecision['bucketDelta']): string {
  const softBreaches = decision.constraintsBreached.some((constraint) =>
    constraint.startsWith('SOFT:')
  );
  let hasBudgetTension = softBreaches;
  if (!hasBudgetTension) {
    const remaining =
      bucketDelta && bucketDelta.newRemainingCents != null
        ? bucketDelta.newRemainingCents
        : null;
    if (remaining != null && remaining <= 0) {
      hasBudgetTension = true;
    }
  }

  if (decision.action.type === 'USE_CARD_WITH_PAYDOWN') {
    return 'PAYDOWN_RECOMMENDED';
  }
  if (hasBudgetTension) {
    return 'PROTECT_BUDGET';
  }
  return 'MAX_REWARDS';
}

function renderUserFacingMessage(params: {
  kind: AutopilotDecisionKind;
  cardLabel: string | null;
  benefitCents: number;
  bucketName: string | null;
  bucketRemainingCents: number | null;
}): string {
  const { kind, cardLabel, benefitCents, bucketName, bucketRemainingCents } = params;

  if (kind === 'BLOCKED') {
    return 'This purchase would break your guardrails. We recommend skipping it.';
  }
  if (kind === 'FALLBACK') {
    return 'We could not compute a safe recommendation. Use your usual card.';
  }

  const label = hasText(cardLabel) ? cardLabel : 'this card';
  const parts: string[] = [`Use ${label}`];

  if (benefitCents > 0) {
    parts.push(`about $${(benefitCents / 100).toFixed(2)} better than your next best card`);
  }

  if (bucketRemainingCents != null) {
    const remainingDollars = (bucketRemainingCents / 100).toFixed(2);
    const bucketLabel = bucketName == null ? 'your budget' : bucketName;
    parts.push(`keeps ${bucketLabel} on track ($${remainingDollars} left)`);
  }

  return `${parts.join(' – ')}.`;
}

function fallbackDecision(reasonCode: string): AutopilotDecision {
  return {
    kind: 'FALLBACK',
    cardId: null,
    reasonCode,
    userFacingMessage: 'We could not compute a safe recommendation. Use your usual card.',
    expectedMonetaryBenefitCents: 0,
    bucketDelta: null,
  };
}

function blockedDecision(reasonCode: string): AutopilotDecision {
  return {
    kind: 'BLOCKED',
    cardId: null,
    reasonCode,
    userFacingMessage: 'This purchase would break your guardrails. We recommend skipping it.',
    expectedMonetaryBenefitCents: 0,
    bucketDelta: null,
  };
}

export async function getAutopilotDecisionForUserSwipe(
  world: World,
  input: SwipeInput
): Promise<AutopilotDecision> {
  const { userId, merchant, amountCents, nowMs } = input;
  const normalizedMerchant = merchant.trim();

  if (nowMs == null || Number.isNaN(nowMs)) {
    throw new Error('Autopilot: nowMs required');
  }
  if (!hasText(userId)) {
    throw new Error('Autopilot: userId required');
  }
  if (!hasText(normalizedMerchant)) {
    throw new Error('Autopilot: merchant required');
  }
  if (!isPositiveNumber(amountCents)) {
    throw new Error('Autopilot: positive amount required');
  }

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
  let merchantCategoryKey: RewardCategory | null = null;
  try {
    merchantCategoryKey = await resolveScanCategory({
      userId,
      merchantName: normalizedMerchant,
      mccCode: null,
      explicitCategory: null,
    });
  } catch {
    merchantCategoryKey = null;
  }

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
  });

  if (!engineResult.ok) {
    return fallbackDecision('FALLBACK_SAFE');
  }

  const sortedCardDecisions = selectCardDecisions(engineResult.decisions, cardUniverseIds);
  if (sortedCardDecisions.length === 0) {
    return blockedDecision('NO_ELIGIBLE_DECISION');
  }

  const [bestDecision, runnerUp] = sortedCardDecisions;
  if (!bestDecision) {
    return blockedDecision('NO_ELIGIBLE_DECISION');
  }
  if (!hasText(bestDecision.action.cardId)) {
    return fallbackDecision('MISSING_CARD_ID');
  }

  const bucketDelta = pickBucketDelta(bestDecision, engineResult.state);
  let bucketName: string | null = null;
  if (bucketDelta) {
    const matched = engineResult.state.buckets.find(
      (bucket) => bucket.id === bucketDelta.bucketId
    );
    bucketName = matched && matched.name != null ? matched.name : null;
  }

  const expectedBest = estimateBenefitCents(
    bestDecision,
    engineResult.state,
    amountCents,
    merchantCategoryKey
  );
  const expectedRunnerUp =
    runnerUp != null
      ? estimateBenefitCents(runnerUp, engineResult.state, amountCents, merchantCategoryKey)
      : 0;
  const expectedMonetaryBenefitCents = Math.max(0, expectedBest - expectedRunnerUp);

  const reasonCode = classifyReasonCode(bestDecision, bucketDelta);
  const matchedCard = engineResult.state.cards.find(
    (card) => card.id === bestDecision.action.cardId
  );
  const cardLabel =
    matchedCard && matchedCard.label != null
      ? matchedCard.label
      : bestDecision.action.cardId != null
        ? bestDecision.action.cardId
        : null;
  const userFacingMessage = renderUserFacingMessage({
    kind: 'OK',
    cardLabel,
    benefitCents: expectedMonetaryBenefitCents,
    bucketName,
    bucketRemainingCents:
      bucketDelta && bucketDelta.newRemainingCents != null
        ? bucketDelta.newRemainingCents
        : null,
  });

  return {
    kind: 'OK',
    cardId: bestDecision.action.cardId == null ? null : bestDecision.action.cardId,
    reasonCode,
    userFacingMessage,
    expectedMonetaryBenefitCents,
    bucketDelta,
  };
}
