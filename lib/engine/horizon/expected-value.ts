import type { HorizonConfig } from './config.js';
import {
  runHorizonRollout,
} from './rollout.js';
import type {
  HorizonRollout,
  SnapshotStateFn,
} from './types.js';
import type { PolicyEvaluator } from './policy.js';
import type { TransitionFn } from './transition.js';
import { aggregateUtilitySamples } from '../objective/utility.js';
import {
  DEFAULT_RISK_LAMBDA,
  riskAdjustedUtility,
} from '../objective/risk.js';
import {
  DEFAULT_EXPECTED_VALUE_SAMPLES,
  normalizeExpectedValueSamples,
  validateUncertaintyState,
} from '../uncertainty/policy.js';
import { createSeededRng } from '../uncertainty/rng.js';
import { realizeState } from '../uncertainty/realize.js';
import type { UncertaintySeed } from '../uncertainty/types.js';

export type ExpectedValueHorizonRollout<TState, TAction, TObjective> = {
  type: 'expected_value';
  seed: UncertaintySeed;
  samples: number;
  expectedUtility: number;
  variance: number;
  riskLambda: number;
  riskAdjustedUtility: number;
  sampleUtilities: readonly number[];
  representativeRollout: HorizonRollout<TState, TAction, TObjective>;
};

export function runExpectedValueHorizonRollout<TState, TAction, TObjective>(args: {
  initialState: TState;
  config: HorizonConfig;
  evaluatePolicy: PolicyEvaluator<TState, TAction, TObjective>;
  applyAction: TransitionFn<TState, TAction>;
  utilityOfRollout: (rollout: HorizonRollout<TState, TAction, TObjective>) => number;
  samples?: number;
  seed: UncertaintySeed;
  riskLambda?: number;
  snapshotState?: SnapshotStateFn<TState>;
}): ExpectedValueHorizonRollout<TState, TAction, TObjective> {
  const samples = normalizeExpectedValueSamples(
    args.samples === undefined ? DEFAULT_EXPECTED_VALUE_SAMPLES : args.samples
  );
  const riskLambda =
    args.riskLambda === undefined ? DEFAULT_RISK_LAMBDA : args.riskLambda;
  const rng = createSeededRng(args.seed);
  const utilities: number[] = [];
  let representativeRollout: HorizonRollout<TState, TAction, TObjective> | null = null;

  validateUncertaintyState(args.initialState);

  // Expected-value rollout cost is O(samples * horizon * transition cost).
  for (let sampleIndex = 0; sampleIndex < samples; sampleIndex += 1) {
    const realizedState = realizeState(args.initialState, rng);
    const rollout = runHorizonRollout<TState, TAction, TObjective>({
      initialState: realizedState,
      config: args.config,
      evaluatePolicy: args.evaluatePolicy,
      applyAction: args.applyAction,
      ...(args.snapshotState === undefined ? {} : { snapshotState: args.snapshotState }),
    });
    const utility = args.utilityOfRollout(rollout);
    if (!Number.isFinite(utility)) {
      throw new Error('Expected-value rollout utility must be finite');
    }
    utilities.push(utility);
    if (representativeRollout === null) {
      representativeRollout = rollout;
    }
  }

  if (representativeRollout === null) {
    throw new Error('Expected-value rollout produced no samples');
  }

  const aggregate = aggregateUtilitySamples(utilities);
  const variance = aggregate.variance;
  return {
    type: 'expected_value',
    seed: args.seed,
    samples,
    expectedUtility: aggregate.expectedUtility,
    variance,
    riskLambda,
    riskAdjustedUtility: riskAdjustedUtility(
      aggregate.expectedUtility,
      variance,
      riskLambda
    ),
    sampleUtilities: utilities,
    representativeRollout,
  };
}
