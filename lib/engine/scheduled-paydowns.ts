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

function emptyEvaluation(sourceStatus: ScheduledPaydownSourceStatus): ScheduledPaydownEvaluation {
  return {
    sourceStatus,
    presentEffective: [],
    futureEligible: [],
    diagnostics: [],
  };
}

type PaydownClassification =
  | { kind: 'SKIP' }
  | { kind: 'MISSING_DEBT' }
  | { kind: 'ELIGIBLE'; debtId: DebtAccountId };

function classifyPaydown(paydown: ScheduledPaydown, debtIds: Set<string>): PaydownClassification {
  if (paydown.status !== 'SCHEDULED') return { kind: 'SKIP' };
  if (!hasPositiveNumber(paydown.amountCents)) return { kind: 'SKIP' };
  if (!hasNonEmptyString(paydown.debtId)) return { kind: 'MISSING_DEBT' };
  if (!debtIds.has(paydown.debtId)) return { kind: 'MISSING_DEBT' };
  return { kind: 'ELIGIBLE', debtId: paydown.debtId };
}

type PartitionedPaydowns = {
  presentEffective: EvaluatedScheduledPaydown[];
  futureEligible: EvaluatedScheduledPaydown[];
  missingDebtIdCount: number;
};

function partitionScheduledPaydowns(
  paydowns: readonly ScheduledPaydown[],
  debtIds: Set<string>,
  decisionTimeMs: number
): PartitionedPaydowns {
  const result: PartitionedPaydowns = { presentEffective: [], futureEligible: [], missingDebtIdCount: 0 };

  for (const [sourceOrder, paydown] of paydowns.entries()) {
    const classification = classifyPaydown(paydown, debtIds);
    if (classification.kind === 'SKIP') continue;
    if (classification.kind === 'MISSING_DEBT') {
      result.missingDebtIdCount += 1;
      continue;
    }

    const evaluated = { ...paydown, debtId: classification.debtId, sourceOrder };
    const target =
      paydown.effectiveAtMs <= decisionTimeMs ? result.presentEffective : result.futureEligible;
    target.push(evaluated);
  }

  return result;
}

export function evaluateScheduledPaydowns(
  state: EngineState,
  decisionTimeMs: number
): ScheduledPaydownEvaluation {
  const scheduledPaydowns = state.scheduledPaydowns;
  if (scheduledPaydowns == null || !hasAvailableValue(scheduledPaydowns)) {
    return emptyEvaluation('UNAVAILABLE');
  }

  if (scheduledPaydowns.value.length === 0) {
    return emptyEvaluation('AVAILABLE_EMPTY');
  }

  const debtIds = new Set<string>(getDebtAccounts(state.debts).map((debt) => debt.id));
  const { presentEffective, futureEligible, missingDebtIdCount } = partitionScheduledPaydowns(
    scheduledPaydowns.value,
    debtIds,
    decisionTimeMs
  );

  return {
    sourceStatus: futureEligible.length > 0 ? 'AVAILABLE_ACTIVE' : 'AVAILABLE_NO_ACTIVE',
    presentEffective,
    futureEligible,
    diagnostics: buildMissingDebtDiagnostic(missingDebtIdCount),
  };
}
