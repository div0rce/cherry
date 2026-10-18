import type { EngineContext, EngineState } from '../types.js';
import { candidateKey, normalizeCandidate } from './normalize.js';

export const candidateSpaceVersion = 'candidates_v1' as const;

export type Candidate =
  | {
      type: 'USE_CARD';
      cardId: string | null;
    }
  | {
      type: 'USE_CARD_WITH_PAYDOWN';
      cardId: string | null;
      debtId: string | null;
      paydownAmountCents: number | null;
      paydownScheduledDateMs: number | null;
    }
  | {
      type: 'PAY_DOWN_DEBT';
      debtId: string | null;
      paydownAmountCents: number | null;
      paydownScheduledDateMs: number | null;
    }
  | {
      type: 'DELAY_PURCHASE';
      delayDays: number | null;
    }
  | {
      type: 'SWITCH_MERCHANT';
      altMerchantName: string | null;
      altMerchantCategoryKey: string | null;
    }
  | {
      type: 'REJECT_PURCHASE';
    };

export type Bounds = Readonly<{
  useCard: {
    cardIds: readonly (string | null)[];
  };
  useCardWithPaydown: {
    cardIds: readonly (string | null)[];
    debtIds: readonly (string | null)[];
    paydownAmountCents: readonly (number | null)[];
    paydownScheduledDateMs: readonly (number | null)[];
  };
  payDownDebt: {
    debtIds: readonly (string | null)[];
    paydownAmountCents: readonly (number | null)[];
    paydownScheduledDateMs: readonly (number | null)[];
  };
  delayPurchase: {
    delayDays: readonly (number | null)[];
  };
  switchMerchant: {
    altMerchantNames: readonly (string | null)[];
    altMerchantCategoryKeys: readonly (string | null)[];
  };
  rejectPurchase: {
    enabled: boolean;
  };
}>;

function candidateSignature(candidate: Candidate): string {
  return candidateKey(candidate);
}

const CANDIDATE_FIELDS: Readonly<Record<Candidate['type'], readonly string[]>> = {
  USE_CARD: ['cardId'],
  USE_CARD_WITH_PAYDOWN: ['cardId', 'debtId', 'paydownAmountCents', 'paydownScheduledDateMs'],
  PAY_DOWN_DEBT: ['debtId', 'paydownAmountCents', 'paydownScheduledDateMs'],
  DELAY_PURCHASE: ['delayDays'],
  SWITCH_MERCHANT: ['altMerchantName', 'altMerchantCategoryKey'],
  REJECT_PURCHASE: [],
};

function candidatesEqual(a: Candidate, b: Candidate): boolean {
  if (a.type !== b.type) return false;
  if (!Object.prototype.hasOwnProperty.call(CANDIDATE_FIELDS, a.type)) return false;
  const fieldsA = a as Readonly<Record<string, unknown>>;
  const fieldsB = b as Readonly<Record<string, unknown>>;
  return CANDIDATE_FIELDS[a.type].every((field) => fieldsA[field] === fieldsB[field]);
}

type PaydownBounds = {
  debtIds: readonly (string | null)[];
  paydownAmountCents: readonly (number | null)[];
  paydownScheduledDateMs: readonly (number | null)[];
};

type PaydownCombo = {
  debtId: string | null;
  paydownAmountCents: number | null;
  paydownScheduledDateMs: number | null;
};

function forEachPaydownCombo(bounds: PaydownBounds, visit: (combo: PaydownCombo) => void): void {
  for (const debtId of bounds.debtIds) {
    for (const paydownAmountCents of bounds.paydownAmountCents) {
      for (const paydownScheduledDateMs of bounds.paydownScheduledDateMs) {
        visit({ debtId, paydownAmountCents, paydownScheduledDateMs });
      }
    }
  }
}

type PushCandidate = (candidate: Candidate) => void;

function createCandidateCollector(): { candidates: Candidate[]; push: PushCandidate } {
  const candidates: Candidate[] = [];
  const seen = new Map<string, Candidate>();
  const push = (candidate: Candidate): void => {
    const normalized = normalizeCandidate(candidate);
    const signature = candidateSignature(normalized);
    const existing = seen.get(signature);
    if (existing != null) {
      if (!candidatesEqual(existing, normalized)) {
        throw new Error(`Candidate key collision for ${signature}`);
      }
      return;
    }
    seen.set(signature, normalized);
    candidates.push(normalized);
  };
  return { candidates, push };
}

function pushCardCandidates(bounds: Bounds, push: PushCandidate): void {
  for (const cardId of bounds.useCard.cardIds) {
    push({ type: 'USE_CARD', cardId });
  }

  for (const cardId of bounds.useCardWithPaydown.cardIds) {
    forEachPaydownCombo(bounds.useCardWithPaydown, (combo) => {
      push({
        type: 'USE_CARD_WITH_PAYDOWN',
        cardId,
        debtId: combo.debtId,
        paydownAmountCents: combo.paydownAmountCents,
        paydownScheduledDateMs: combo.paydownScheduledDateMs,
      });
    });
  }

  forEachPaydownCombo(bounds.payDownDebt, (combo) => {
    push({
      type: 'PAY_DOWN_DEBT',
      debtId: combo.debtId,
      paydownAmountCents: combo.paydownAmountCents,
      paydownScheduledDateMs: combo.paydownScheduledDateMs,
    });
  });
}

function pushNonCardCandidates(bounds: Bounds, push: PushCandidate): void {
  for (const delayDays of bounds.delayPurchase.delayDays) {
    push({ type: 'DELAY_PURCHASE', delayDays });
  }

  for (const altMerchantName of bounds.switchMerchant.altMerchantNames) {
    for (const altMerchantCategoryKey of bounds.switchMerchant.altMerchantCategoryKeys) {
      push({
        type: 'SWITCH_MERCHANT',
        altMerchantName,
        altMerchantCategoryKey,
      });
    }
  }

  if (bounds.rejectPurchase.enabled) {
    push({ type: 'REJECT_PURCHASE' });
  }
}

function compareCandidateKeys(a: Candidate, b: Candidate): number {
  const keyA = candidateKey(a);
  const keyB = candidateKey(b);
  if (keyA === keyB) return 0;
  return keyA < keyB ? -1 : 1;
}

export function enumerateCandidatesBounded(
  _state: EngineState,
  _ctx: EngineContext,
  bounds: Bounds
): readonly Candidate[] {
  const { candidates, push } = createCandidateCollector();
  pushCardCandidates(bounds, push);
  pushNonCardCandidates(bounds, push);
  candidates.sort(compareCandidateKeys);
  return candidates;
}
