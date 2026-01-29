import { OBJECTIVE_PROFILES } from '../objective.js';
import type { EngineValidationIssue } from '../types.js';
import type {
  EngineInput,
  EngineInputBucket,
  EngineInputCard,
  EngineInputDebt,
  EngineInputDebtCardLink,
  EngineInputWeights,
} from './EngineInput.js';
import { engineInputVersion } from './EngineInput.js';

const SURFACES = new Set([
  'web',
  'extension',
  'vine',
  'wallet_pass',
  'watch',
  'sms',
  'unknown',
]);

function hasNonEmptyString(value: string | null | undefined): value is string {
  return value !== null && value !== undefined && value !== '';
}

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isWholeNumber(value: number | null | undefined): value is number {
  return isFiniteNumber(value) && Number.isInteger(value);
}

function validateWeights(weights: EngineInputWeights, prefix: string): EngineValidationIssue[] {
  const issues: EngineValidationIssue[] = [];

  const entries: Array<[keyof EngineInputWeights, number | null]> = [
    ['rewards', weights.rewards],
    ['runway', weights.runway],
    ['debtRelief', weights.debtRelief],
    ['volatility', weights.volatility],
    ['ruleViolations', weights.ruleViolations],
  ];

  for (const [key, value] of entries) {
    if (value === null) continue;
    if (!isFiniteNumber(value)) {
      issues.push({ field: `${prefix}.${String(key)}`, message: 'Weight must be finite' });
      continue;
    }
    if (value < 0) {
      issues.push({ field: `${prefix}.${String(key)}`, message: 'Weight must be >= 0' });
    }
  }

  return issues;
}

function validateBucket(bucket: EngineInputBucket, index: number): EngineValidationIssue[] {
  const issues: EngineValidationIssue[] = [];
  const prefix = `buckets[${index}]`;

  if (!hasNonEmptyString(bucket.id)) {
    issues.push({ field: `${prefix}.id`, message: 'Bucket id required' });
  }
  if (!hasNonEmptyString(bucket.categoryKey)) {
    issues.push({ field: `${prefix}.categoryKey`, message: 'Bucket categoryKey required' });
  }
  if (!isWholeNumber(bucket.postedSpendCents)) {
    issues.push({ field: `${prefix}.postedSpendCents`, message: 'postedSpendCents must be integer' });
  } else if (bucket.postedSpendCents < 0) {
    issues.push({ field: `${prefix}.postedSpendCents`, message: 'postedSpendCents must be >= 0' });
  }
  if (!isWholeNumber(bucket.pendingSpendCents)) {
    issues.push({ field: `${prefix}.pendingSpendCents`, message: 'pendingSpendCents must be integer' });
  } else if (bucket.pendingSpendCents < 0) {
    issues.push({ field: `${prefix}.pendingSpendCents`, message: 'pendingSpendCents must be >= 0' });
  }
  if (bucket.limitCents !== null) {
    if (!isWholeNumber(bucket.limitCents)) {
      issues.push({ field: `${prefix}.limitCents`, message: 'limitCents must be integer' });
    } else if (bucket.limitCents < 0) {
      issues.push({ field: `${prefix}.limitCents`, message: 'limitCents must be >= 0' });
    }
  }

  return issues;
}

function validateDebt(debt: EngineInputDebt, index: number): EngineValidationIssue[] {
  const issues: EngineValidationIssue[] = [];
  const prefix = `debts[${index}]`;

  if (!hasNonEmptyString(debt.id)) {
    issues.push({ field: `${prefix}.id`, message: 'Debt id required' });
  }
  if (debt.type !== 'CREDIT_CARD' && debt.type !== 'LOAN' && debt.type !== 'OTHER') {
    issues.push({ field: `${prefix}.type`, message: 'Debt type invalid' });
  }
  if (!isWholeNumber(debt.balanceCents)) {
    issues.push({ field: `${prefix}.balanceCents`, message: 'balanceCents must be integer' });
  } else if (debt.balanceCents < 0) {
    issues.push({ field: `${prefix}.balanceCents`, message: 'balanceCents must be >= 0' });
  }
  if (debt.creditLimitCents !== null) {
    if (!isWholeNumber(debt.creditLimitCents)) {
      issues.push({ field: `${prefix}.creditLimitCents`, message: 'creditLimitCents must be integer' });
    } else if (debt.creditLimitCents < 0) {
      issues.push({ field: `${prefix}.creditLimitCents`, message: 'creditLimitCents must be >= 0' });
    }
  }
  if (!isFiniteNumber(debt.aprPercent)) {
    issues.push({ field: `${prefix}.aprPercent`, message: 'aprPercent must be finite' });
  } else if (debt.aprPercent < 0) {
    issues.push({ field: `${prefix}.aprPercent`, message: 'aprPercent must be >= 0' });
  }

  return issues;
}

function validateCard(card: EngineInputCard, index: number): EngineValidationIssue[] {
  const issues: EngineValidationIssue[] = [];
  const prefix = `cards[${index}]`;

  if (!hasNonEmptyString(card.id)) {
    issues.push({ field: `${prefix}.id`, message: 'Card id required' });
  }

  for (const [i, rule] of card.rewardRules.entries()) {
    const rulePrefix = `${prefix}.rewardRules[${i}]`;

    if (!hasNonEmptyString(rule.categoryKey)) {
      issues.push({ field: `${rulePrefix}.categoryKey`, message: 'Reward categoryKey required' });
    }
    if (rule.rateType !== 'CASHBACK' && rule.rateType !== 'POINTS_PER_DOLLAR') {
      issues.push({ field: `${rulePrefix}.rateType`, message: 'Reward rateType invalid' });
    }
    if (!isFiniteNumber(rule.rateValue)) {
      issues.push({ field: `${rulePrefix}.rateValue`, message: 'Reward rateValue must be finite' });
    } else if (rule.rateValue < 0) {
      issues.push({ field: `${rulePrefix}.rateValue`, message: 'Reward rateValue must be >= 0' });
    }
  }

  return issues;
}

function validateLinks(
  links: EngineInputDebtCardLink[],
  cards: EngineInputCard[],
  debts: EngineInputDebt[]
): EngineValidationIssue[] {
  const issues: EngineValidationIssue[] = [];
  const cardIds = new Set(cards.map((card) => card.id));
  const debtIds = new Set(debts.map((debt) => debt.id));
  const seen = new Set<string>();

  for (const [i, link] of links.entries()) {
    const prefix = `debtCardLinks[${i}]`;

    if (!hasNonEmptyString(link.cardId)) {
      issues.push({ field: `${prefix}.cardId`, message: 'cardId required' });
    }
    if (!hasNonEmptyString(link.debtId)) {
      issues.push({ field: `${prefix}.debtId`, message: 'debtId required' });
    }

    if (hasNonEmptyString(link.cardId) && !cardIds.has(link.cardId)) {
      issues.push({ field: `${prefix}.cardId`, message: 'cardId not found in cards' });
    }
    if (hasNonEmptyString(link.debtId) && !debtIds.has(link.debtId)) {
      issues.push({ field: `${prefix}.debtId`, message: 'debtId not found in debts' });
    }

    if (hasNonEmptyString(link.cardId) && hasNonEmptyString(link.debtId)) {
      const key = `${link.cardId}::${link.debtId}`;
      if (seen.has(key)) {
        issues.push({ field: prefix, message: 'Duplicate debtCardLink' });
      } else {
        seen.add(key);
      }
    }
  }

  return issues;
}

export function validateEngineInput(input: EngineInput): EngineValidationIssue[] {
  const issues: EngineValidationIssue[] = [];

  if (input.__version !== engineInputVersion) {
    issues.push({ field: '__version', message: 'EngineInput version mismatch' });
  }

  if (!SURFACES.has(input.request.surface)) {
    issues.push({ field: 'request.surface', message: 'Surface invalid' });
  }

  if (!isWholeNumber(input.request.amountCents)) {
    issues.push({ field: 'request.amountCents', message: 'amountCents must be integer' });
  } else if (input.request.amountCents < 0) {
    issues.push({ field: 'request.amountCents', message: 'amountCents must be >= 0' });
  }

  if (input.request.merchantCategoryKey !== null) {
    if (!hasNonEmptyString(input.request.merchantCategoryKey)) {
      issues.push({ field: 'request.merchantCategoryKey', message: 'merchantCategoryKey required' });
    }
  }

  if (input.balances.cash.liquidCents !== null) {
    if (!isWholeNumber(input.balances.cash.liquidCents)) {
      issues.push({ field: 'balances.cash.liquidCents', message: 'liquidCents must be integer' });
    }
  }

  for (const [i, bucket] of input.buckets.entries()) {
    issues.push(...validateBucket(bucket, i));
  }

  for (const [i, debt] of input.debts.entries()) {
    issues.push(...validateDebt(debt, i));
  }

  for (const [i, card] of input.cards.entries()) {
    issues.push(...validateCard(card, i));
  }

  if (input.constraints.hard.maxCardUtilization !== null) {
    const value = input.constraints.hard.maxCardUtilization;
    if (!isFiniteNumber(value)) {
      issues.push({ field: 'constraints.hard.maxCardUtilization', message: 'maxCardUtilization must be finite' });
    } else if (value < 0) {
      issues.push({ field: 'constraints.hard.maxCardUtilization', message: 'maxCardUtilization must be >= 0' });
    }
  }

  if (OBJECTIVE_PROFILES[input.preferences.profileId] === undefined) {
    issues.push({ field: 'preferences.profileId', message: 'profileId invalid' });
  }

  if (input.preferences.customWeights !== null) {
    issues.push(...validateWeights(input.preferences.customWeights, 'preferences.customWeights'));
  }

  if (input.solver.maxCandidates !== null) {
    if (!isWholeNumber(input.solver.maxCandidates)) {
      issues.push({ field: 'solver.maxCandidates', message: 'maxCandidates must be integer' });
    } else if (input.solver.maxCandidates <= 0) {
      issues.push({ field: 'solver.maxCandidates', message: 'maxCandidates must be > 0' });
    }
  }

  if (input.solver.weightsOverride !== null) {
    issues.push(...validateWeights(input.solver.weightsOverride, 'solver.weightsOverride'));
  }

  issues.push(...validateLinks(input.debtCardLinks, input.cards, input.debts));

  return issues;
}
