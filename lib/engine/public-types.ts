export type AutopilotDecisionKind = 'OK' | 'BLOCKED' | 'FALLBACK';

export interface AutopilotDecision {
  kind: AutopilotDecisionKind;
  cardId: string | null;
  reasonCode: string;
  userFacingMessage: string;
  expectedMonetaryBenefitCents: number;
  bucketDelta: {
    bucketId: string;
    newSpentCents: number;
    newRemainingCents: number;
  } | null;
}

export interface SwipeInput {
  userId: string;
  merchant: string;
  amountCents: number;
  cardUniverseIds: string[];
  nowMs: number;
}
