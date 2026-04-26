import type { EngineExclusions } from './types.js';

export const CREDIT_ACTIONS_EXCLUDED_UNRESOLVABLE_CREDIT_LIABILITY_CODE =
  'CREDIT_ACTIONS_EXCLUDED_UNRESOLVABLE_CREDIT_LIABILITY' as const;

const CREDIT_ACTIONS_EXCLUDED_UNRESOLVABLE_CREDIT_LIABILITY_MESSAGE =
  'Credit recommendations were excluded because the credit liability could not be fully resolved.';

export type EngineDegradation = {
  code: typeof CREDIT_ACTIONS_EXCLUDED_UNRESOLVABLE_CREDIT_LIABILITY_CODE;
  message: string;
} | null;

export function createEmptyEngineExclusions(): EngineExclusions {
  return {
    creditActionsGeneratedCount: 0,
    creditUnresolvableLiabilityCount: 0,
  };
}

export function deriveEngineDegradation(
  exclusions: Pick<EngineExclusions, 'creditUnresolvableLiabilityCount'> | null | undefined
): EngineDegradation {
  if (exclusions == null || exclusions.creditUnresolvableLiabilityCount <= 0) {
    return null;
  }
  return {
    code: CREDIT_ACTIONS_EXCLUDED_UNRESOLVABLE_CREDIT_LIABILITY_CODE,
    message: CREDIT_ACTIONS_EXCLUDED_UNRESOLVABLE_CREDIT_LIABILITY_MESSAGE,
  };
}

export function deriveUnresolvableCreditLiabilityWarningText(
  degradation: EngineDegradation | null | undefined
): string | null {
  if (degradation == null) return null;
  return CREDIT_ACTIONS_EXCLUDED_UNRESOLVABLE_CREDIT_LIABILITY_MESSAGE;
}
