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

type Issues = EngineValidationIssue[];

type TextCheck = { field: string; value: string | null | undefined; message: string };
type NumberCheck = { field: string; label: string; value: number };
type OptionalNumberCheck = { field: string; label: string; value: number | null };

function requireText(issues: Issues, check: TextCheck): void {
  if (!hasNonEmptyString(check.value)) {
    issues.push({ field: check.field, message: check.message });
  }
}

function checkWholeNonNegative(issues: Issues, check: NumberCheck): void {
  const { field, label, value } = check;
  if (!isWholeNumber(value)) {
    issues.push({ field, message: `${label} must be integer` });
  } else if (value < 0) {
    issues.push({ field, message: `${label} must be >= 0` });
  }
}

function checkFiniteNonNegative(issues: Issues, check: NumberCheck): void {
  const { field, label, value } = check;
  if (!isFiniteNumber(value)) {
    issues.push({ field, message: `${label} must be finite` });
  } else if (value < 0) {
    issues.push({ field, message: `${label} must be >= 0` });
  }
}

function checkOptionalWholeNonNegative(issues: Issues, check: OptionalNumberCheck): void {
  const { field, label, value } = check;
  if (value !== null) checkWholeNonNegative(issues, { field, label, value });
}

function validateWeights(weights: EngineInputWeights, prefix: string): Issues {
  const issues: Issues = [];

  const entries: Array<[keyof EngineInputWeights, number | null]> = [
    ['rewards', weights.rewards],
    ['runway', weights.runway],
    ['debtRelief', weights.debtRelief],
  ];

  for (const [key, value] of entries) {
    if (value === null) continue;
    checkFiniteNonNegative(issues, { field: `${prefix}.${String(key)}`, label: 'Weight', value });
  }

  return issues;
}

function validateBucket(bucket: EngineInputBucket, index: number): Issues {
  const issues: Issues = [];
  const prefix = `buckets[${index}]`;

  requireText(issues, { field: `${prefix}.id`, value: bucket.id, message: 'Bucket id required' });
  requireText(issues, { field: `${prefix}.categoryKey`, value: bucket.categoryKey, message: 'Bucket categoryKey required' });
  checkWholeNonNegative(issues, { field: `${prefix}.postedSpendCents`, label: 'postedSpendCents', value: bucket.postedSpendCents });
  checkWholeNonNegative(issues, { field: `${prefix}.pendingSpendCents`, label: 'pendingSpendCents', value: bucket.pendingSpendCents });
  checkOptionalWholeNonNegative(issues, { field: `${prefix}.limitCents`, label: 'limitCents', value: bucket.limitCents });

  return issues;
}

const DEBT_TYPES: ReadonlySet<string> = new Set(['CREDIT_CARD', 'LOAN', 'OTHER']);
const REWARD_RATE_TYPES: ReadonlySet<string> = new Set(['CASHBACK', 'POINTS_PER_DOLLAR']);

function validateDebt(debt: EngineInputDebt, index: number): Issues {
  const issues: Issues = [];
  const prefix = `debts[${index}]`;

  requireText(issues, { field: `${prefix}.id`, value: debt.id, message: 'Debt id required' });
  if (!DEBT_TYPES.has(debt.type)) {
    issues.push({ field: `${prefix}.type`, message: 'Debt type invalid' });
  }
  checkWholeNonNegative(issues, { field: `${prefix}.balanceCents`, label: 'balanceCents', value: debt.balanceCents });
  checkOptionalWholeNonNegative(issues, { field: `${prefix}.creditLimitCents`, label: 'creditLimitCents', value: debt.creditLimitCents });
  checkFiniteNonNegative(issues, { field: `${prefix}.aprPercent`, label: 'aprPercent', value: debt.aprPercent });

  return issues;
}

function validateCard(card: EngineInputCard, index: number): Issues {
  const issues: Issues = [];
  const prefix = `cards[${index}]`;

  requireText(issues, { field: `${prefix}.id`, value: card.id, message: 'Card id required' });

  for (const [i, rule] of card.rewardRules.entries()) {
    const rulePrefix = `${prefix}.rewardRules[${i}]`;

    requireText(issues, { field: `${rulePrefix}.categoryKey`, value: rule.categoryKey, message: 'Reward categoryKey required' });
    if (!REWARD_RATE_TYPES.has(rule.rateType)) {
      issues.push({ field: `${rulePrefix}.rateType`, message: 'Reward rateType invalid' });
    }
    checkFiniteNonNegative(issues, { field: `${rulePrefix}.rateValue`, label: 'Reward rateValue', value: rule.rateValue });
  }

  return issues;
}

function checkLinkReference(
  issues: Issues,
  field: string,
  id: string,
  known: { ids: Set<string>; message: string }
): void {
  if (hasNonEmptyString(id) && !known.ids.has(id)) {
    issues.push({ field, message: known.message });
  }
}

function checkDuplicateLink(issues: Issues, prefix: string, link: EngineInputDebtCardLink, seen: Set<string>): void {
  if (!hasNonEmptyString(link.cardId) || !hasNonEmptyString(link.debtId)) return;
  const key = `${link.cardId}::${link.debtId}`;
  if (seen.has(key)) {
    issues.push({ field: prefix, message: 'Duplicate debtCardLink' });
  } else {
    seen.add(key);
  }
}

function validateLinks(
  links: EngineInputDebtCardLink[],
  cards: EngineInputCard[],
  debts: EngineInputDebt[]
): Issues {
  const issues: Issues = [];
  const cardIds = { ids: new Set<string>(cards.map((card) => card.id)), message: 'cardId not found in cards' };
  const debtIds = { ids: new Set<string>(debts.map((debt) => debt.id)), message: 'debtId not found in debts' };
  const seen = new Set<string>();

  for (const [i, link] of links.entries()) {
    const prefix = `debtCardLinks[${i}]`;

    requireText(issues, { field: `${prefix}.cardId`, value: link.cardId, message: 'cardId required' });
    requireText(issues, { field: `${prefix}.debtId`, value: link.debtId, message: 'debtId required' });
    checkLinkReference(issues, `${prefix}.cardId`, link.cardId, cardIds);
    checkLinkReference(issues, `${prefix}.debtId`, link.debtId, debtIds);
    checkDuplicateLink(issues, prefix, link, seen);
  }

  return issues;
}

function validateRequest(issues: Issues, input: EngineInput): void {
  if (input.__version !== engineInputVersion) {
    issues.push({ field: '__version', message: 'EngineInput version mismatch' });
  }

  if (!SURFACES.has(input.request.surface)) {
    issues.push({ field: 'request.surface', message: 'Surface invalid' });
  }

  checkWholeNonNegative(issues, { field: 'request.amountCents', label: 'amountCents', value: input.request.amountCents });

  const merchantCategoryKey = input.request.merchantCategoryKey;
  if (merchantCategoryKey !== null) {
    requireText(issues, { field: 'request.merchantCategoryKey', value: merchantCategoryKey, message: 'merchantCategoryKey required' });
  }

  const liquidCents = input.balances.cash.liquidCents;
  if (liquidCents !== null && !isWholeNumber(liquidCents)) {
    issues.push({ field: 'balances.cash.liquidCents', message: 'liquidCents must be integer' });
  }
}

function validateEntities(issues: Issues, input: EngineInput): void {
  for (const [i, bucket] of input.buckets.entries()) {
    issues.push(...validateBucket(bucket, i));
  }

  for (const [i, debt] of input.debts.entries()) {
    issues.push(...validateDebt(debt, i));
  }

  for (const [i, card] of input.cards.entries()) {
    issues.push(...validateCard(card, i));
  }
}

function validateMaxCandidates(issues: Issues, maxCandidates: number | null): void {
  if (maxCandidates === null) return;
  if (!isWholeNumber(maxCandidates)) {
    issues.push({ field: 'solver.maxCandidates', message: 'maxCandidates must be integer' });
  } else if (maxCandidates <= 0) {
    issues.push({ field: 'solver.maxCandidates', message: 'maxCandidates must be > 0' });
  }
}

function validateSettings(issues: Issues, input: EngineInput): void {
  const maxCardUtilization = input.constraints.hard.maxCardUtilization;
  if (maxCardUtilization !== null) {
    checkFiniteNonNegative(issues, { field: 'constraints.hard.maxCardUtilization', label: 'maxCardUtilization', value: maxCardUtilization });
  }

  if (!Object.prototype.hasOwnProperty.call(OBJECTIVE_PROFILES, input.preferences.profileId)) {
    issues.push({ field: 'preferences.profileId', message: 'profileId invalid' });
  }

  if (input.preferences.customWeights !== null) {
    issues.push(...validateWeights(input.preferences.customWeights, 'preferences.customWeights'));
  }

  validateMaxCandidates(issues, input.solver.maxCandidates);

  if (input.solver.weightsOverride !== null) {
    issues.push(...validateWeights(input.solver.weightsOverride, 'solver.weightsOverride'));
  }
}

export function validateEngineInput(input: EngineInput): Issues {
  const issues: Issues = [];
  validateRequest(issues, input);
  validateEntities(issues, input);
  validateSettings(issues, input);
  issues.push(...validateLinks(input.debtCardLinks, input.cards, input.debts));
  return issues;
}
