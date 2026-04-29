import type { HorizonConfig } from './config.js';
import type {
  HorizonRollout,
  SnapshotStateFn,
  HorizonStep,
  HorizonStepRole,
  HorizonTransitionReason,
} from './types.js';
import type { PolicyEvaluator } from './policy.js';
import { choosePlanningAction } from './policy.js';
import type { TransitionFn } from './transition.js';
import { transitionFutureState } from './transition.js';

function stepRoleFor(step: number): HorizonStepRole {
  return step === 0 ? 'selected_present_action' : 'projected_future_action';
}

function transitionReasonFor<TAction>(
  stepRole: HorizonStepRole,
  action: TAction | null
): HorizonTransitionReason {
  if (action === null) {
    return 'projected_state_only';
  }

  return stepRole === 'selected_present_action'
    ? 'selected_present_action_projected'
    : 'projected_future_action';
}

const defaultSnapshotState = <TState>(state: TState): TState =>
  structuredClone(state);

export function runHorizonRollout<TState, TAction, TObjective>(args: {
  initialState: TState;
  config: HorizonConfig;
  evaluatePolicy: PolicyEvaluator<TState, TAction, TObjective>;
  applyAction: TransitionFn<TState, TAction>;
  snapshotState?: SnapshotStateFn<TState>;
}): HorizonRollout<TState, TAction, TObjective> {
  const steps: HorizonStep<TState, TAction, TObjective>[] = [];
  const snapshotState =
    args.snapshotState === undefined ? defaultSnapshotState : args.snapshotState;

  let state = args.initialState;
  let selectedPresentAction: TAction | null = null;

  for (let step = 0; step < args.config.steps; step += 1) {
    const stateBefore = snapshotState(state);
    const stepRole = stepRoleFor(step);
    const { action, objective } = choosePlanningAction({
      state,
      step,
      evaluatePolicy: args.evaluatePolicy,
    });

    if (step === 0) {
      selectedPresentAction = action;
    }

    const stateAfter =
      action === null
        ? state
        : transitionFutureState({
            state,
            action,
            step,
            applyAction: args.applyAction,
          });
    const stateAfterSnapshot = snapshotState(stateAfter);

    steps.push({
      step,
      label: 'planning_projection',
      stepRole,
      stateBefore,
      action,
      objective,
      stateAfter: stateAfterSnapshot,
      transitionReason: transitionReasonFor(stepRole, action),
    });

    state = stateAfter;
  }

  return {
    label: 'planning_projection',
    horizonSteps: args.config.steps,
    futureJustification: args.config.futureJustification,
    selectedPresentAction,
    steps,
  };
}
