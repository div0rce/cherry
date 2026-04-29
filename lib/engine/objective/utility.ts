export type UtilityCents = number & { readonly __brand: 'UtilityCents' };

export const OBJECTIVE_SCORE_UNIT = 'utility_usd_cents' as const;
export type ObjectiveScoreUnit = typeof OBJECTIVE_SCORE_UNIT;

const CENTS_PER_DOLLAR = 100;

export const REWARD_POINT_VALUE_CENTS = 1;

/** @deprecated Use REWARD_POINT_VALUE_CENTS and rewardPointsToUtilityCents. */
export const POINTS_PER_DOLLAR = 100;

export type ObjectiveComponentKind =
  | 'cash_benefit'
  | 'reward_value'
  | 'debt_relief'
  | 'liquidity_pressure'
  | 'constraint_penalty'
  | 'bounded_heuristic';

export type ObjectiveComponent = {
  key: string;
  kind: ObjectiveComponentKind;
  utilityCents: UtilityCents;
  interpretation: string;
  boundedHeuristic?: boolean;
};

export type UtilityResult = {
  expectedUtility: number;
  variance?: number;
  samples?: number;
};

export function utilityCents(value: number): UtilityCents {
  if (!Number.isFinite(value)) {
    throw new Error('Utility cents must be finite');
  }
  return value as UtilityCents;
}

export function rewardPointsToUtilityCents(points: number): UtilityCents {
  return utilityCents(points * REWARD_POINT_VALUE_CENTS);
}

export function pointsToUtilityCents(points: number): UtilityCents {
  return rewardPointsToUtilityCents(points);
}

export function dollarsToUtilityCents(dollars: number): UtilityCents {
  return utilityCents(Math.round(dollars * CENTS_PER_DOLLAR));
}

export function centsToUtilityCents(cents: number): UtilityCents {
  return utilityCents(cents);
}

export function sumObjectiveUtility(
  components: readonly ObjectiveComponent[]
): UtilityCents {
  return utilityCents(
    components.reduce((sum, component) => sum + component.utilityCents, 0)
  );
}

export function aggregateUtilitySamples(samples: readonly number[]): Required<UtilityResult> {
  if (samples.length === 0) {
    throw new Error('Utility samples must not be empty');
  }

  let total = 0;
  for (const value of samples) {
    if (!Number.isFinite(value)) {
      throw new Error('Utility samples must be finite');
    }
    total += value;
  }

  const expectedUtility = total / samples.length;
  const squaredErrorTotal = samples.reduce((sum, value) => {
    const delta = value - expectedUtility;
    return sum + delta * delta;
  }, 0);

  return {
    expectedUtility,
    variance: squaredErrorTotal / samples.length,
    samples: samples.length,
  };
}
