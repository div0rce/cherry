import type { EngineDegradation } from './degradation.js';

export type AutopilotDecisionKind = 'OK' | 'BLOCKED' | 'FALLBACK';

export interface AutopilotDecision {
  kind: AutopilotDecisionKind;
  cardId: string | null;
  reasonCode: string;
  userFacingMessage: string;
  expectedMonetaryBenefitCents: number | null;
  expectedPointsDelta: number | null;
  bucketDelta: {
    bucketId: string;
    newSpentCents: number;
    newRemainingCents: number;
  } | null;
  degradation?: EngineDegradation;
}

export interface SwipeInput {
  userId: string;
  merchant: string;
  amountCents: number;
  cardUniverseIds: string[];
  nowMs: number;
}
