import type { EngineAction, EngineDecision } from '../types.js';
import type { Candidate } from './candidates.js';

type CandidateType = Candidate['type'];
type CandidateFieldValue = string | number | null;

// Per-type candidate fields, in the canonical order used for objects and keys.
export const CANDIDATE_FIELDS: Readonly<Record<CandidateType, readonly string[]>> = {
  USE_CARD: ['cardId'],
  USE_CARD_WITH_PAYDOWN: ['cardId', 'debtId', 'paydownAmountCents', 'paydownScheduledDateMs'],
  PAY_DOWN_DEBT: ['debtId', 'paydownAmountCents', 'paydownScheduledDateMs'],
  DELAY_PURCHASE: ['delayDays'],
  SWITCH_MERCHANT: ['altMerchantName', 'altMerchantCategoryKey'],
  REJECT_PURCHASE: [],
};

const CANDIDATE_KEY_PREFIX: Readonly<Record<CandidateType, string>> = {
  USE_CARD: 'use_card',
  USE_CARD_WITH_PAYDOWN: 'use_card_with_paydown',
  PAY_DOWN_DEBT: 'pay_down_debt',
  DELAY_PURCHASE: 'delay_purchase',
  SWITCH_MERCHANT: 'switch_merchant',
  REJECT_PURCHASE: 'reject_purchase',
};

export function isKnownCandidateType(type: string): type is CandidateType {
  return Object.prototype.hasOwnProperty.call(CANDIDATE_FIELDS, type);
}

function readFields(source: object): Readonly<Record<string, CandidateFieldValue | undefined>> {
  return source as Readonly<Record<string, CandidateFieldValue | undefined>>;
}

function undefinedToNull(value: CandidateFieldValue | undefined): CandidateFieldValue {
  return value === undefined ? null : value;
}

function buildCandidate(type: CandidateType, source: object): Candidate {
  const fields = readFields(source);
  const candidate: Record<string, CandidateFieldValue> = { type };
  for (const field of CANDIDATE_FIELDS[type]) {
    candidate[field] = undefinedToNull(fields[field]);
  }
  return candidate as Candidate;
}

export function normalizeCandidate(candidate: Candidate): Candidate {
  if (!isKnownCandidateType(candidate.type)) return { type: 'REJECT_PURCHASE' };
  return buildCandidate(candidate.type, candidate);
}

export function normalizeCandidateToAction(candidate: Candidate): EngineAction {
  const normalized = normalizeCandidate(candidate);
  const fields = readFields(normalized);
  const action: EngineAction = { type: normalized.type };
  const target = action as Record<string, unknown>;
  for (const field of CANDIDATE_FIELDS[normalized.type]) {
    const value = fields[field];
    if (value !== null && value !== undefined) {
      target[field] = value;
    }
  }
  return action;
}

function axis(value: CandidateFieldValue | undefined): string {
  if (value === null) return 'null';
  return typeof value === 'number' ? `n:${value}` : `s:${value}`;
}

export function candidateKey(candidate: Candidate): string {
  const normalized = normalizeCandidate(candidate);
  const fields = readFields(normalized);
  const axes = CANDIDATE_FIELDS[normalized.type].map((field) => `:${axis(fields[field])}`);
  return `${CANDIDATE_KEY_PREFIX[normalized.type]}${axes.join('')}`;
}

export function normalizeEngineDecisionToCandidate(
  decision: EngineDecision
): Candidate | null {
  if (decision == null || decision.action == null) {
    return null;
  }
  const action = decision.action;
  if (!isKnownCandidateType(action.type)) return null;
  return normalizeCandidate(buildCandidate(action.type, action));
}
