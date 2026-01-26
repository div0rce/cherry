import type { BankTransaction } from '@prisma/client';
import { fromExternalContextToEngineContext } from '../engine/context.js';
import { fromPrismaUserToEngineState } from '../engine-state.js';
import { safeSolveDecisionForUser } from '../engine/solver.js';
import type { EngineDecision } from '../engine/types';

export function defaultRunIdForUser(userId: string, now: Date): string {
  const date = now.toISOString().slice(0, 10);
  return `offline-${userId}-${date}`;
}

export type OfflineEvaluationInput = {
  userId: string;
  tx: BankTransaction;
};

export type OfflineEvaluationResult = {
  decisionType: string;
  cardId: string | null;
  bucketId: string | null;
  rawDecision: unknown;
  scores: unknown | null;
  regimeId?: string | null;
  bucketKey?: string | null;
  bucketUsageBeforeBps?: number | null;
  bucketUsageAfterBps?: number | null;
};

const MIN_EVALUATABLE_CENTS = 100; // skip penny noise

function normalizeAmountMinor(tx: BankTransaction): number {
  const direction = (tx.direction ?? '').toLowerCase() === 'credit' ? 'credit' : 'debit';
  if (typeof tx.amountMinor === 'number' && Number.isFinite(tx.amountMinor)) {
    return tx.amountMinor;
  }
  const rawAmount = Number(tx.amount ?? 0);
  const cents = Math.round(rawAmount * 100);
  return direction === 'credit' ? cents : cents * -1;
}

function mapDecision(decision: EngineDecision | undefined): OfflineEvaluationResult {
  if (decision === undefined) {
    return {
      decisionType: 'NO_DECISION',
      cardId: null,
      bucketId: null,
      rawDecision: null,
      scores: null,
    };
  }

  const bucketId = decision.projections.buckets.at(0)?.bucketId ?? null;
  const cardId =
    (decision.action.type === 'USE_CARD' || decision.action.type === 'USE_CARD_WITH_PAYDOWN') &&
    decision.action.cardId !== null &&
    decision.action.cardId !== undefined &&
    decision.action.cardId !== ''
      ? decision.action.cardId
      : null;

  return {
    decisionType: decision.action.type,
    cardId,
    bucketId,
    rawDecision: decision,
    scores: decision.components ?? null,
  };
}

export async function evaluateTransactionOffline(
  input: OfflineEvaluationInput,
): Promise<OfflineEvaluationResult> {
  const { userId, tx } = input;
  const direction = (tx.direction ?? '').toLowerCase();
  const amountMinor = normalizeAmountMinor(tx);
  const absAmount = Math.abs(amountMinor);

  if (direction !== 'debit' || absAmount < MIN_EVALUATABLE_CENTS) {
    return {
      decisionType: 'NO_DECISION_SKIPPED',
      cardId: null,
      bucketId: null,
      rawDecision: null,
      scores: null,
    };
  }

  const txTimestamp = tx.postedAt ?? tx.occurredAt;
  if (txTimestamp == null) {
    return {
      decisionType: 'NO_DECISION',
      cardId: null,
      bucketId: null,
      rawDecision: null,
      scores: null,
    };
  }

  const ctx = fromExternalContextToEngineContext({
    surface: 'web',
    nowMs: txTimestamp.getTime(),
    merchantName: tx.description ?? tx.rawDescription ?? null,
    mcc: tx.mcc != null ? String(tx.mcc) : null,
    amountCents: absAmount,
  });

  const state = await fromPrismaUserToEngineState(userId, ctx.nowMs);
  const outcome = await safeSolveDecisionForUser(userId, ctx, {
    maxCandidates: 64,
    stateOverride: state,
    includeLegacyDecision: false,
  });
  if (!outcome.ok || outcome.decisions.length === 0) {
    return {
      decisionType: 'NO_DECISION',
      cardId: null,
      bucketId: null,
      rawDecision: null,
      scores: null,
    };
  }

  const bestDecision = outcome.decisions[0];
  return mapDecision(bestDecision);
}
