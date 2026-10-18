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

type EngineRuntimeOption = SolveDecisionOptions['runtime'];

function resolveRuntimeWithLogger(world: World, runtimeOption: EngineRuntimeOption) {
  const runtime = runtimeOption != null ? runtimeOption : DEFAULT_ENGINE_RUNTIME;
  return runtime.logger ? runtime : { ...runtime, logger: world.logger };
}

function adapterOptionsFrom(options: SolveDecisionOptions) {
  return {
    maxCandidates: options.maxCandidates !== undefined ? options.maxCandidates : null,
    weightsOverride: options.weights !== undefined ? options.weights : null,
  };
}

function applySolverOptions(
  overrides: SolveDecisionOptions,
  solverOptions: ReturnType<typeof buildSolverOptionsFromInput>
): SolveDecisionOptions {
  if (solverOptions.weights !== null) {
    overrides.weights = solverOptions.weights;
  }
  if (solverOptions.maxCandidates !== null) {
    overrides.maxCandidates = solverOptions.maxCandidates;
  }
  return overrides;
}

type PreparedSolverOptions =
  | { ok: true; solverOptions: ReturnType<typeof buildSolverOptionsFromInput> }
  | { ok: false; issueCount: number };

function prepareSolverOptions(
  state: EngineState,
  context: EngineContext,
  adapterOptions: ReturnType<typeof adapterOptionsFrom> | null
): PreparedSolverOptions {
  const engineInput = fromLegacy({
    state,
    context,
    options: adapterOptions,
  });
  const inputIssues = validateEngineInput(engineInput);
  if (inputIssues.length > 0) {
    return { ok: false, issueCount: inputIssues.length };
  }
  return { ok: true, solverOptions: buildSolverOptionsFromInput(engineInput) };
}

type LegacyDecisionProvider = NonNullable<SolveDecisionOptions['legacyDecisionProvider']>;

function requireLegacyProvider(provider: LegacyDecisionProvider | undefined): LegacyDecisionProvider {
  if (provider === undefined) {
    throw new EngineError('legacyDecisionProvider required when includeLegacyDecision is true');
  }
  return provider;
}

async function attachLegacyDecision<T extends object>(
  result: T,
  provider: LegacyDecisionProvider,
  userId: string,
  ctx: EngineContext
) {
  const legacyInput = buildLegacyEngineInput(userId, ctx);
  const legacyDecision = await provider(legacyInput);
  return { ...result, legacyDecision };
}

export async function runEngine(world: World, input: EngineRunInput): Promise<SolveDecisionResult> {
  const runtimeWithLogger = resolveRuntimeWithLogger(world, input.options?.runtime);

  const adapterOptions = input.options !== undefined ? adapterOptionsFrom(input.options) : null;
  const prepared = prepareSolverOptions(input.state, input.context, adapterOptions);
  if (!prepared.ok) {
    throw new EngineError(`EngineInput validation failed: ${prepared.issueCount} issues`);
  }
  const solverOptions = prepared.solverOptions;
  const safeOptionsBase: SolveDecisionOptions = input.options !== undefined ? input.options : {};
  const { legacyDecisionProvider, ...safeOptions } = safeOptionsBase;
  const includeLegacyDecision = safeOptionsBase.includeLegacyDecision === true;

  const solverOverrides = applySolverOptions(
    {
      ...safeOptions,
      includeLegacyDecision: false,
      runtime: runtimeWithLogger,
    },
    solverOptions
  );

  const result = await solveDecision(input.state, input.context, solverOverrides);

  if (!includeLegacyDecision) return result;
  return attachLegacyDecision(
    result,
    requireLegacyProvider(legacyDecisionProvider),
    input.state.userId,
    input.context
  );
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

  const runtimeWithLogger = resolveRuntimeWithLogger(world, options.runtime);
  const adapterOptions = adapterOptionsFrom(options);
  const prepared = prepareSolverOptions(options.stateOverride, context, adapterOptions);
  if (!prepared.ok) {
    return {
      ok: false,
      reason: 'VALIDATION_ERROR',
      message: `EngineInput validation failed: ${prepared.issueCount} issues`,
      ...runtimeMetadata,
    };
  }
  const solverOptions = prepared.solverOptions;
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

  const solverOverrides = applySolverOptions(
    {
      ...safeOptions,
      includeLegacyDecision: false,
      runtime: runtimeWithLogger,
      stateOverride: options.stateOverride,
    },
    solverOptions
  );

  const result = await safeSolveDecisionForUser(userId, context, solverOverrides);

  if (result.ok !== true) return result;

  if (includeLegacyDecision && legacyDecisionProvider !== undefined) {
    return attachLegacyDecision(result, legacyDecisionProvider, userId, context);
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
