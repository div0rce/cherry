import type { EngineAction, EngineDecision } from '../types.js';
import type { Candidate } from './candidates.js';

function normalizeString(value: string | null | undefined): string | null {
  return value === undefined ? null : value;
}

function normalizeNumber(value: number | null | undefined): number | null {
  return value === undefined ? null : value;
}

export function normalizeCandidate(candidate: Candidate): Candidate {
  switch (candidate.type) {
    case 'USE_CARD':
      return {
        type: 'USE_CARD',
        cardId: normalizeString(candidate.cardId),
      };
    case 'USE_CARD_WITH_PAYDOWN':
      return {
        type: 'USE_CARD_WITH_PAYDOWN',
        cardId: normalizeString(candidate.cardId),
        debtId: normalizeString(candidate.debtId),
        paydownAmountCents: normalizeNumber(candidate.paydownAmountCents),
        paydownScheduledDateMs: normalizeNumber(candidate.paydownScheduledDateMs),
      };
    case 'PAY_DOWN_DEBT':
      return {
        type: 'PAY_DOWN_DEBT',
        debtId: normalizeString(candidate.debtId),
        paydownAmountCents: normalizeNumber(candidate.paydownAmountCents),
        paydownScheduledDateMs: normalizeNumber(candidate.paydownScheduledDateMs),
      };
    case 'DELAY_PURCHASE':
      return {
        type: 'DELAY_PURCHASE',
        delayDays: normalizeNumber(candidate.delayDays),
      };
    case 'SWITCH_MERCHANT':
      return {
        type: 'SWITCH_MERCHANT',
        altMerchantName: normalizeString(candidate.altMerchantName),
        altMerchantCategoryKey: normalizeString(candidate.altMerchantCategoryKey),
      };
    case 'REJECT_PURCHASE':
      return { type: 'REJECT_PURCHASE' };
    default:
      return { type: 'REJECT_PURCHASE' };
  }
}

export function normalizeCandidateToAction(candidate: Candidate): EngineAction {
  const normalized = normalizeCandidate(candidate);
  switch (normalized.type) {
    case 'USE_CARD': {
      const action: EngineAction = { type: 'USE_CARD' };
      if (normalized.cardId !== null) {
        action.cardId = normalized.cardId;
      }
      return action;
    }
    case 'USE_CARD_WITH_PAYDOWN': {
      const action: EngineAction = { type: 'USE_CARD_WITH_PAYDOWN' };
      if (normalized.cardId !== null) {
        action.cardId = normalized.cardId;
      }
      if (normalized.debtId !== null) {
        action.debtId = normalized.debtId;
      }
      if (normalized.paydownAmountCents !== null) {
        action.paydownAmountCents = normalized.paydownAmountCents;
      }
      if (normalized.paydownScheduledDateMs !== null) {
        action.paydownScheduledDateMs = normalized.paydownScheduledDateMs;
      }
      return action;
    }
    case 'PAY_DOWN_DEBT': {
      const action: EngineAction = { type: 'PAY_DOWN_DEBT' };
      if (normalized.debtId !== null) {
        action.debtId = normalized.debtId;
      }
      if (normalized.paydownAmountCents !== null) {
        action.paydownAmountCents = normalized.paydownAmountCents;
      }
      if (normalized.paydownScheduledDateMs !== null) {
        action.paydownScheduledDateMs = normalized.paydownScheduledDateMs;
      }
      return action;
    }
    case 'DELAY_PURCHASE': {
      const action: EngineAction = { type: 'DELAY_PURCHASE' };
      if (normalized.delayDays !== null) {
        action.delayDays = normalized.delayDays;
      }
      return action;
    }
    case 'SWITCH_MERCHANT': {
      const action: EngineAction = { type: 'SWITCH_MERCHANT' };
      if (normalized.altMerchantName !== null) {
        action.altMerchantName = normalized.altMerchantName;
      }
      if (normalized.altMerchantCategoryKey !== null) {
        action.altMerchantCategoryKey = normalized.altMerchantCategoryKey;
      }
      return action;
    }
    case 'REJECT_PURCHASE':
      return { type: 'REJECT_PURCHASE' };
    default:
      return { type: 'REJECT_PURCHASE' };
  }
}

export function candidateKey(candidate: Candidate): string {
  const normalized = normalizeCandidate(candidate);
  const axis = (value: string | number | null): string => {
    if (value === null) return 'null';
    return typeof value === 'number' ? `n:${value}` : `s:${value}`;
  };
  switch (normalized.type) {
    case 'USE_CARD':
      return `use_card:${axis(normalized.cardId)}`;
    case 'USE_CARD_WITH_PAYDOWN':
      return `use_card_with_paydown:${axis(normalized.cardId)}:${axis(
        normalized.debtId
      )}:${axis(normalized.paydownAmountCents)}:${axis(normalized.paydownScheduledDateMs)}`;
    case 'PAY_DOWN_DEBT':
      return `pay_down_debt:${axis(normalized.debtId)}:${axis(
        normalized.paydownAmountCents
      )}:${axis(normalized.paydownScheduledDateMs)}`;
    case 'SWITCH_MERCHANT':
      return `switch_merchant:${axis(normalized.altMerchantName)}:${axis(
        normalized.altMerchantCategoryKey
      )}`;
    case 'DELAY_PURCHASE':
      return `delay_purchase:${axis(normalized.delayDays)}`;
    case 'REJECT_PURCHASE':
      return 'reject_purchase';
    default:
      return 'reject_purchase';
  }
}

export function normalizeEngineDecisionToCandidate(
  decision: EngineDecision
): Candidate | null {
  if (decision == null || decision.action == null) {
    return null;
  }
  const action = decision.action;
  switch (action.type) {
    case 'USE_CARD':
      return normalizeCandidate({
        type: 'USE_CARD',
        cardId: action.cardId === undefined ? null : action.cardId,
      });
    case 'USE_CARD_WITH_PAYDOWN':
      return normalizeCandidate({
        type: 'USE_CARD_WITH_PAYDOWN',
        cardId: action.cardId === undefined ? null : action.cardId,
        debtId: action.debtId === undefined ? null : action.debtId,
        paydownAmountCents:
          action.paydownAmountCents === undefined ? null : action.paydownAmountCents,
        paydownScheduledDateMs:
          action.paydownScheduledDateMs === undefined ? null : action.paydownScheduledDateMs,
      });
    case 'PAY_DOWN_DEBT':
      return normalizeCandidate({
        type: 'PAY_DOWN_DEBT',
        debtId: action.debtId === undefined ? null : action.debtId,
        paydownAmountCents:
          action.paydownAmountCents === undefined ? null : action.paydownAmountCents,
        paydownScheduledDateMs:
          action.paydownScheduledDateMs === undefined ? null : action.paydownScheduledDateMs,
      });
    case 'DELAY_PURCHASE':
      return normalizeCandidate({
        type: 'DELAY_PURCHASE',
        delayDays: action.delayDays === undefined ? null : action.delayDays,
      });
    case 'SWITCH_MERCHANT':
      return normalizeCandidate({
        type: 'SWITCH_MERCHANT',
        altMerchantName:
          action.altMerchantName === undefined ? null : action.altMerchantName,
        altMerchantCategoryKey:
          action.altMerchantCategoryKey === undefined ? null : action.altMerchantCategoryKey,
      });
    case 'REJECT_PURCHASE':
      return normalizeCandidate({ type: 'REJECT_PURCHASE' });
    default:
      return null;
  }
}
