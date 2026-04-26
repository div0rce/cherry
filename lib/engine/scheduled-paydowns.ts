import {
  getDebtAccounts,
  hasAvailableValue,
  type DebtAccountId,
  type EngineState,
  type EngineTraceDiagnostic,
  type ScheduledPaydown,
} from './types.js';

export const SCHEDULED_PAYDOWN_MISSING_DEBT_ID = 'SCHEDULED_PAYDOWN_MISSING_DEBT_ID' as const;

export type ScheduledPaydownSourceStatus =
  | 'UNAVAILABLE'
  | 'AVAILABLE_EMPTY'
  | 'AVAILABLE_NO_ACTIVE'
  | 'AVAILABLE_ACTIVE';

export type EvaluatedScheduledPaydown = ScheduledPaydown & {
  debtId: DebtAccountId;
  sourceOrder: number;
};

export type ScheduledPaydownEvaluation = {
  sourceStatus: ScheduledPaydownSourceStatus;
  presentEffective: EvaluatedScheduledPaydown[];
  futureEligible: EvaluatedScheduledPaydown[];
  diagnostics: EngineTraceDiagnostic[];
};

function hasNonEmptyString(value?: string | null): value is string {
  return value !== undefined && value !== null && value !== '';
}

function hasPositiveNumber(value?: number | null): value is number {
  return value !== undefined && value !== null && Number.isFinite(value) && value > 0;
}

function buildMissingDebtDiagnostic(count: number): EngineTraceDiagnostic[] {
  return count > 0
    ? [{ code: SCHEDULED_PAYDOWN_MISSING_DEBT_ID, count }]
    : [];
}

export function evaluateScheduledPaydowns(
  state: EngineState,
  decisionTimeMs: number
): ScheduledPaydownEvaluation {
  const scheduledPaydowns = state.scheduledPaydowns;
  if (scheduledPaydowns == null || !hasAvailableValue(scheduledPaydowns)) {
    return {
      sourceStatus: 'UNAVAILABLE',
      presentEffective: [],
      futureEligible: [],
      diagnostics: [],
    };
  }

  if (scheduledPaydowns.value.length === 0) {
    return {
      sourceStatus: 'AVAILABLE_EMPTY',
      presentEffective: [],
      futureEligible: [],
      diagnostics: [],
    };
  }

  const debtIds = new Set(getDebtAccounts(state.debts).map((debt) => debt.id));
  const presentEffective: EvaluatedScheduledPaydown[] = [];
  const futureEligible: EvaluatedScheduledPaydown[] = [];
  let missingDebtIdCount = 0;

  for (const [sourceOrder, paydown] of scheduledPaydowns.value.entries()) {
    if (paydown.status !== 'SCHEDULED') continue;
    if (!hasPositiveNumber(paydown.amountCents)) continue;
    if (!hasNonEmptyString(paydown.debtId) || !debtIds.has(paydown.debtId)) {
      missingDebtIdCount += 1;
      continue;
    }

    const evaluated = { ...paydown, debtId: paydown.debtId, sourceOrder };
    if (paydown.effectiveAtMs <= decisionTimeMs) {
      presentEffective.push(evaluated);
    } else {
      futureEligible.push(evaluated);
    }
  }

  return {
    sourceStatus: futureEligible.length > 0 ? 'AVAILABLE_ACTIVE' : 'AVAILABLE_NO_ACTIVE',
    presentEffective,
    futureEligible,
    diagnostics: buildMissingDebtDiagnostic(missingDebtIdCount),
  };
}
