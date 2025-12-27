import type { World } from '../adapters/world';
import {
  safeSolveDecisionForUser,
  solveDecision,
  type SafeDecisionOutcome,
  type SolveDecisionOptions,
  type SolveDecisionResult,
} from './solver';
import type { EngineContext, EngineState } from './types';
import { DEFAULT_ENGINE_RUNTIME } from './runtime';

export type EngineRunInput = {
  state: EngineState;
  context: EngineContext;
  options?: SolveDecisionOptions;
};

export async function runEngine(world: World, input: EngineRunInput): Promise<SolveDecisionResult> {
  const runtime =
    input.options && input.options.runtime != null
      ? input.options.runtime
      : DEFAULT_ENGINE_RUNTIME;
  const runtimeWithLogger = runtime.logger ? runtime : { ...runtime, logger: world.logger };

  return solveDecision(input.state, input.context, {
    ...input.options,
    runtime: runtimeWithLogger,
  });
}

export async function safeSolveDecisionForWorld(
  world: World,
  userId: string,
  context: EngineContext,
  options: SolveDecisionOptions = {}
): Promise<SafeDecisionOutcome> {
  const runtime = options.runtime != null ? options.runtime : DEFAULT_ENGINE_RUNTIME;
  const runtimeWithLogger = runtime.logger ? runtime : { ...runtime, logger: world.logger };
  return safeSolveDecisionForUser(userId, context, {
    ...options,
    runtime: runtimeWithLogger,
  });
}
