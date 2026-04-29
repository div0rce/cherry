export type PolicyEvaluator<TState, TAction, TObjective> = (args: {
  state: TState;
  step: number;
}) => {
  action: TAction | null;
  objective: TObjective | null;
};

export function choosePlanningAction<TState, TAction, TObjective>(args: {
  state: TState;
  step: number;
  evaluatePolicy: PolicyEvaluator<TState, TAction, TObjective>;
}): {
  action: TAction | null;
  objective: TObjective | null;
} {
  return args.evaluatePolicy({
    state: args.state,
    step: args.step,
  });
}
