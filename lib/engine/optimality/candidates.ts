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

function candidatesEqual(a: Candidate, b: Candidate): boolean {
  if (a.type !== b.type) return false;
  switch (a.type) {
    case 'USE_CARD':
      return b.type === 'USE_CARD' && a.cardId === b.cardId;
    case 'USE_CARD_WITH_PAYDOWN':
      return (
        b.type === 'USE_CARD_WITH_PAYDOWN' &&
        a.cardId === b.cardId &&
        a.debtId === b.debtId &&
        a.paydownAmountCents === b.paydownAmountCents &&
        a.paydownScheduledDateMs === b.paydownScheduledDateMs
      );
    case 'PAY_DOWN_DEBT':
      return (
        b.type === 'PAY_DOWN_DEBT' &&
        a.debtId === b.debtId &&
        a.paydownAmountCents === b.paydownAmountCents &&
        a.paydownScheduledDateMs === b.paydownScheduledDateMs
      );
    case 'DELAY_PURCHASE':
      return b.type === 'DELAY_PURCHASE' && a.delayDays === b.delayDays;
    case 'SWITCH_MERCHANT':
      return (
        b.type === 'SWITCH_MERCHANT' &&
        a.altMerchantName === b.altMerchantName &&
        a.altMerchantCategoryKey === b.altMerchantCategoryKey
      );
    case 'REJECT_PURCHASE':
      return true;
    default:
      return false;
  }
}

export function enumerateCandidatesBounded(
  _state: EngineState,
  _ctx: EngineContext,
  bounds: Bounds
): readonly Candidate[] {
  const candidates: Candidate[] = [];
  const seen = new Map<string, Candidate>();

  const pushCandidate = (candidate: Candidate): void => {
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

  for (const cardId of bounds.useCard.cardIds) {
    pushCandidate({ type: 'USE_CARD', cardId });
  }

  for (const cardId of bounds.useCardWithPaydown.cardIds) {
    for (const debtId of bounds.useCardWithPaydown.debtIds) {
      for (const paydownAmountCents of bounds.useCardWithPaydown.paydownAmountCents) {
        for (const paydownScheduledDateMs of bounds.useCardWithPaydown.paydownScheduledDateMs) {
          pushCandidate({
            type: 'USE_CARD_WITH_PAYDOWN',
            cardId,
            debtId,
            paydownAmountCents,
            paydownScheduledDateMs,
          });
        }
      }
    }
  }

  for (const debtId of bounds.payDownDebt.debtIds) {
    for (const paydownAmountCents of bounds.payDownDebt.paydownAmountCents) {
      for (const paydownScheduledDateMs of bounds.payDownDebt.paydownScheduledDateMs) {
        pushCandidate({
          type: 'PAY_DOWN_DEBT',
          debtId,
          paydownAmountCents,
          paydownScheduledDateMs,
        });
      }
    }
  }

  for (const delayDays of bounds.delayPurchase.delayDays) {
    pushCandidate({ type: 'DELAY_PURCHASE', delayDays });
  }

  for (const altMerchantName of bounds.switchMerchant.altMerchantNames) {
    for (const altMerchantCategoryKey of bounds.switchMerchant.altMerchantCategoryKeys) {
      pushCandidate({
        type: 'SWITCH_MERCHANT',
        altMerchantName,
        altMerchantCategoryKey,
      });
    }
  }

  if (bounds.rejectPurchase.enabled) {
    pushCandidate({ type: 'REJECT_PURCHASE' });
  }

  candidates.sort((a, b) => {
    const keyA = candidateKey(a);
    const keyB = candidateKey(b);
    if (keyA === keyB) return 0;
    return keyA < keyB ? -1 : 1;
  });

  return candidates;
}
