import type { FutureJustification } from './config.js';

export type HorizonStepIndex = number;

export type HorizonLabel = 'planning_projection';

export type HorizonStepRole =
  | 'selected_present_action'
  | 'projected_future_action';

export type HorizonTransitionReason =
  | 'selected_present_action_projected'
  | 'projected_future_action'
  | 'projected_state_only';

export type HorizonStep<TState, TAction, TObjective> = {
  step: HorizonStepIndex;
  label: HorizonLabel;
  stepRole: HorizonStepRole;
  stateBefore: TState;
  action: TAction | null;
  objective: TObjective | null;
  stateAfter: TState;
  transitionReason: HorizonTransitionReason;
};

export type HorizonRollout<TState, TAction, TObjective> = {
  label: HorizonLabel;
  horizonSteps: number;
  futureJustification: FutureJustification;
  selectedPresentAction: TAction | null;
  steps: readonly HorizonStep<TState, TAction, TObjective>[];
};
