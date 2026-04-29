export type TransitionFn<TState, TAction> = (args: {
  state: TState;
  action: TAction;
  step: number;
}) => TState;

export function transitionFutureState<TState, TAction>(args: {
  state: TState;
  action: TAction;
  step: number;
  applyAction: TransitionFn<TState, TAction>;
}): TState {
  return args.applyAction({
    state: args.state,
    action: args.action,
    step: args.step,
  });
}
