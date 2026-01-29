import type { World } from '../adapters/world.js';
import {
  safeSolveDecisionForUser,
  solveDecision,
  type SafeDecisionOutcome,
  type SolveDecisionOptions,
  type SolveDecisionResult,
} from './solver.js';
import type { EngineContext, EngineState } from './types.js';
import { DEFAULT_ENGINE_RUNTIME } from './runtime.js';
import type { EngineInput as LegacyEngineInput } from '../legacy-engine-types.js';
import { EngineError } from './guardrails.js';
import { fromLegacy } from './input/fromLegacy.js';
import {
  buildEngineContextFromInput,
  buildEngineStateFromInput,
  buildSolverOptionsFromInput,
} from './input/bridge.js';

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

  const adapterOptions =
    input.options !== undefined
      ? {
          maxCandidates:
            input.options.maxCandidates !== undefined ? input.options.maxCandidates : null,
          weightsOverride:
            input.options.weights !== undefined ? input.options.weights : null,
        }
      : null;
  const engineInput = fromLegacy({
    state: input.state,
    context: input.context,
    options: adapterOptions,
  });
  const solverOptions = buildSolverOptionsFromInput(engineInput);
  const state = buildEngineStateFromInput({ input: engineInput, userId: input.state.userId });
  const ctx = buildEngineContextFromInput({ input: engineInput, nowMs: input.context.nowMs });
  const includeLegacyDecision =
    input.options !== undefined && input.options.includeLegacyDecision === true;
  const legacyDecisionProvider =
    input.options !== undefined ? input.options.legacyDecisionProvider : undefined;

  const result = await solveDecision(state, ctx, {
    ...input.options,
    weights: solverOptions.weights,
    maxCandidates: solverOptions.maxCandidates,
    includeLegacyDecision: false,
    legacyDecisionProvider: undefined,
    runtime: runtimeWithLogger,
  });

  if (includeLegacyDecision) {
    if (legacyDecisionProvider === undefined) {
      throw new EngineError('legacyDecisionProvider required when includeLegacyDecision is true');
    }
    const legacyInput = buildLegacyEngineInput(state.userId, input.context);
    const legacyDecision = await legacyDecisionProvider(legacyInput);
    return { ...result, legacyDecision };
  }

  return result;
}

export async function safeSolveDecisionForWorld(
  world: World,
  userId: string,
  context: EngineContext,
  options: SolveDecisionOptions = {}
): Promise<SafeDecisionOutcome> {
  if (options.stateOverride === undefined) {
    return {
      ok: false,
      reason: 'VALIDATION_ERROR',
      message: 'safeSolveDecisionForUser requires a stateOverride',
    };
  }

  const runtime = options.runtime != null ? options.runtime : DEFAULT_ENGINE_RUNTIME;
  const runtimeWithLogger = runtime.logger ? runtime : { ...runtime, logger: world.logger };
  const adapterOptions = {
    maxCandidates: options.maxCandidates !== undefined ? options.maxCandidates : null,
    weightsOverride: options.weights !== undefined ? options.weights : null,
  };
  const engineInput = fromLegacy({
    state: options.stateOverride,
    context,
    options: adapterOptions,
  });
  const solverOptions = buildSolverOptionsFromInput(engineInput);
  const state = buildEngineStateFromInput({ input: engineInput, userId });
  const ctx = buildEngineContextFromInput({ input: engineInput, nowMs: context.nowMs });
  const includeLegacyDecision =
    options.includeLegacyDecision == null ? true : options.includeLegacyDecision;
  const legacyDecisionProvider = options.legacyDecisionProvider;

  if (includeLegacyDecision && legacyDecisionProvider === undefined) {
    return {
      ok: false,
      reason: 'VALIDATION_ERROR',
      message: 'legacyDecisionProvider required when includeLegacyDecision is true',
    };
  }

  const result = await safeSolveDecisionForUser(userId, ctx, {
    ...options,
    weights: solverOptions.weights,
    maxCandidates: solverOptions.maxCandidates,
    includeLegacyDecision: false,
    legacyDecisionProvider: undefined,
    runtime: runtimeWithLogger,
    stateOverride: state,
  });

  if (result.ok !== true) return result;

  if (includeLegacyDecision && legacyDecisionProvider !== undefined) {
    const legacyInput = buildLegacyEngineInput(userId, context);
    const legacyDecision = await legacyDecisionProvider(legacyInput);
    return { ...result, legacyDecision };
  }

  return result;
}

function buildLegacyEngineInput(userId: string, ctx: EngineContext): LegacyEngineInput {
  const parsedMcc =
    ctx.mcc != null && ctx.mcc !== '' ? Number.parseInt(String(ctx.mcc), 10) : null;

  return {
    userId,
    amountCents: ctx.amountCents == null ? 0 : ctx.amountCents,
    category: ctx.merchantCategoryKey == null ? null : ctx.merchantCategoryKey,
    merchantName: ctx.merchantName == null ? null : ctx.merchantName,
    mccCode: Number.isInteger(parsedMcc) ? parsedMcc : null,
    nowMs: ctx.nowMs,
  };
}
