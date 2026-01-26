import type { LegacyEngineDecision } from './engine';

// Throws if the decision violates internal consistency checks.
export function validateEngineDecision(decision: LegacyEngineDecision): void {
  const {
    amountCents,
    budget,
    card,
    overallVerdict,
    cherryIncentive,
  } = decision;

  if (amountCents < 0) {
    throw new Error('Engine invariant violated: amountCents must be non-negative');
  }

  if (budget.hasBucket === true) {
    if (budget.coverageMode !== 'BUDGETED') {
      throw new Error('Engine invariant violated: bucket present but coverageMode not BUDGETED');
    }

    if (budget.spentBeforeCents !== undefined && budget.spentBeforeCents < 0) {
      throw new Error('Engine invariant violated: spentBeforeCents < 0');
    }

    if (budget.spentAfterCents !== undefined && budget.spentAfterCents < 0) {
      throw new Error('Engine invariant violated: spentAfterCents < 0');
    }

    if (
      budget.limitCents !== undefined &&
      budget.spentAfterCents !== undefined &&
      budget.limitCents >= 0 &&
      budget.spentAfterCents > budget.limitCents * 10
    ) {
      throw new Error('Engine invariant violated: spentAfterCents exceeds hard cap');
    }

    if (budget.strictMode === true && budget.wouldExceed === true && budget.verdict === 'HEALTHY') {
      throw new Error('Engine invariant violated: strict bucket overspent but marked HEALTHY');
    }
  } else if (budget.coverageMode === 'BUDGETED') {
    throw new Error('Engine invariant violated: coverageMode BUDGETED without bucket');
  }

  if (budget.verdict === 'UNCONFIGURED' && budget.coverageMode !== 'UNCONFIGURED') {
    throw new Error('Engine invariant violated: UNCONFIGURED budget with mismatched coverageMode');
  }

  if (card.verdict === 'NO_CARD_DATA') {
    if (card.cardId !== null && card.cardId !== undefined && card.cardId !== '') {
      throw new Error('Engine invariant violated: NO_CARD_DATA but cardId set');
    }
    if (cherryIncentive.pointsIfFollowed > 0) {
      throw new Error('Engine invariant violated: NO_CARD_DATA but points offered');
    }
  }

  if (overallVerdict === 'INSUFFICIENT_DATA' && cherryIncentive.pointsIfFollowed > 0) {
    throw new Error('Engine invariant violated: INSUFFICIENT_DATA but points offered');
  }
}
