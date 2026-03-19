import type { World } from '../adapters/world.js';
import {
  safeSolveDecisionForUser,
  solveDecision,
  type SafeDecisionOutcome,
  type SolveDecisionOptions,
  type SolveDecisionResult,
} from './solver.js';
import {
  getEngineRuntimeMetadata,
  type EngineContext,
  type EngineState,
} from './types.js';
import { DEFAULT_ENGINE_RUNTIME } from './runtime.js';
import type { LegacyEngineInput } from '../legacy-engine-types.js';
import { EngineError } from './guardrails.js';
import { fromLegacy } from './input/fromLegacy.js';
import { buildSolverOptionsFromInput } from './input/bridge.js';
import { validateEngineInput } from './input/validate.js';

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
  const inputIssues = validateEngineInput(engineInput);
  if (inputIssues.length > 0) {
    throw new EngineError(`EngineInput validation failed: ${inputIssues.length} issues`);
  }
  const solverOptions = buildSolverOptionsFromInput(engineInput);
  const safeOptionsBase = input.options !== undefined ? input.options : {};
  const { legacyDecisionProvider, ...safeOptions } = safeOptionsBase;
  const includeLegacyDecision = safeOptionsBase.includeLegacyDecision === true;

  const solverOverrides: SolveDecisionOptions = {
    ...safeOptions,
    includeLegacyDecision: false,
    runtime: runtimeWithLogger,
  };
  if (solverOptions.weights !== null) {
    solverOverrides.weights = solverOptions.weights;
  }
  if (solverOptions.maxCandidates !== null) {
    solverOverrides.maxCandidates = solverOptions.maxCandidates;
  }

  const result = await solveDecision(input.state, input.context, solverOverrides);

  if (includeLegacyDecision) {
    if (legacyDecisionProvider === undefined) {
      throw new EngineError('legacyDecisionProvider required when includeLegacyDecision is true');
    }
    const legacyInput = buildLegacyEngineInput(input.state.userId, input.context);
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
  const runtimeMetadata = getEngineRuntimeMetadata(options.stateOverride);
  if (options.stateOverride === undefined) {
    return {
      ok: false,
      reason: 'VALIDATION_ERROR',
      message: 'safeSolveDecisionForUser requires a stateOverride',
      ...runtimeMetadata,
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
  const inputIssues = validateEngineInput(engineInput);
  if (inputIssues.length > 0) {
    return {
      ok: false,
      reason: 'VALIDATION_ERROR',
      message: `EngineInput validation failed: ${inputIssues.length} issues`,
      ...runtimeMetadata,
    };
  }
  const solverOptions = buildSolverOptionsFromInput(engineInput);
  const { legacyDecisionProvider, ...safeOptions } = options;
  const includeLegacyDecision =
    options.includeLegacyDecision == null ? true : options.includeLegacyDecision;

  if (includeLegacyDecision && legacyDecisionProvider === undefined) {
    return {
      ok: false,
      reason: 'VALIDATION_ERROR',
      message: 'legacyDecisionProvider required when includeLegacyDecision is true',
      ...runtimeMetadata,
    };
  }

  const solverOverrides: SolveDecisionOptions = {
    ...safeOptions,
    includeLegacyDecision: false,
    runtime: runtimeWithLogger,
    stateOverride: options.stateOverride,
  };
  if (solverOptions.weights !== null) {
    solverOverrides.weights = solverOptions.weights;
  }
  if (solverOptions.maxCandidates !== null) {
    solverOverrides.maxCandidates = solverOptions.maxCandidates;
  }

  const result = await safeSolveDecisionForUser(userId, context, solverOverrides);

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
