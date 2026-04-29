import type { HorizonConfig } from './config.js';
import type {
  HorizonRollout,
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

export function runHorizonRollout<TState, TAction, TObjective>(args: {
  initialState: TState;
  config: HorizonConfig;
  evaluatePolicy: PolicyEvaluator<TState, TAction, TObjective>;
  applyAction: TransitionFn<TState, TAction>;
}): HorizonRollout<TState, TAction, TObjective> {
  const steps: HorizonStep<TState, TAction, TObjective>[] = [];

  let state = args.initialState;
  let selectedPresentAction: TAction | null = null;

  for (let step = 0; step < args.config.steps; step += 1) {
    const stateBefore = state;
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

    steps.push({
      step,
      label: 'planning_projection',
      stepRole,
      stateBefore,
      action,
      objective,
      stateAfter,
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
