import { logGuardrailEvent } from '@/lib/log';
import { isPositiveNumber } from '@/lib/numbers';
import { hasText } from '@/lib/text';
import type { AutopilotDecision, SwipeInput } from '@/lib/engine/public-types';

export async function getAutopilotDecisionForUserSwipe(
  input: SwipeInput
): Promise<AutopilotDecision> {
  const hasUser = hasText(input.userId);
  const hasMerchant = hasText(input.merchant);
  const hasAmount = isPositiveNumber(input.amountCents);
  const hasCards =
    Array.isArray(input.cardUniverseIds) &&
    input.cardUniverseIds.length > 0 &&
    input.cardUniverseIds.every((cardId) => hasText(cardId));

  if (!hasUser || !hasMerchant || !hasAmount || !hasCards) {
    logGuardrailEvent({
      userId: hasUser ? input.userId : null,
      surface: 'simulate',
      outcome: 'BLOCK',
      reason: 'INVALID_SWIPE_INPUT',
    });

    return {
      kind: 'BLOCKED',
      cardId: null,
      reasonCode: 'INVALID_SWIPE_INPUT',
      userFacingMessage: 'Unable to evaluate swipe. Check merchant, amount, and card selection.',
      expectedMonetaryBenefitCents: 0,
      bucketDelta: null,
    };
  }

  logGuardrailEvent({
    userId: input.userId,
    surface: 'simulate',
    outcome: 'FALLBACK',
    reason: 'AUTOPILOT_STUB',
  });

  return {
    kind: 'FALLBACK',
    cardId: input.cardUniverseIds[0] ?? null,
    reasonCode: 'AUTOPILOT_STUB',
    userFacingMessage: 'Autopilot decision not implemented yet.',
    expectedMonetaryBenefitCents: 0,
    bucketDelta: null,
  };
}
