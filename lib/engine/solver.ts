import { generateCandidateActions } from './candidates.js';
import { simulateAction } from './simulate.js';
import {
  DEFAULT_OBJECTIVE_WEIGHTS,
  scoreDecision,
  getObjectiveWeightsForState,
  normalizeObjectiveWeights,
} from './objective.js';
import {
  EngineError,
  enforceHardConstraints,
  evaluateConstraintsForDecision,
  formatConstraintTag,
  getHardConstraints,
  validateEngineContext,
  validateEngineState,
} from './guardrails.js';
import { ENGINE_VERSION } from './context.js';
import type {
  EngineAction,
  EngineContext,
  EngineDecision,
  EngineDecisionTrace,
  EngineExclusions,
  EngineRuntimeMetadata,
  EngineState,
  ObjectiveWeights,
} from './types.js';
import {
  getDebtAccounts,
  getEngineRuntimeMetadata,
} from './types.js';
import { DEFAULT_ENGINE_RUNTIME, type EngineRuntime } from './runtime.js';
import type { EngineDecision as LegacyEngineDecision, LegacyEngineInput } from '../legacy-engine-types.js';
import { asAppError } from '../errors.js';
import { createEmptyEngineExclusions } from './degradation.js';
import {
  actionRequiresResolvableCreditLiability,
  findActionCard,
  hasUnresolvableCreditLiability,
} from './credit-liability.js';
import {
  attachAccountingProof,
  buildAccountingSnapshot,
  filterAccountingSafeDecisions,
  type EngineDecisionWithAccounting,
} from '../accounting/engine-proof.js';

export type SolveDecisionOptions = {
  weights?: Partial<ObjectiveWeights>;
  maxCandidates?: number;
  includeLegacyDecision?: boolean;
  legacyDecisionProvider?: (input: LegacyEngineInput) => Promise<LegacyEngineDecision>;
  stateOverride?: EngineState;
  runtime?: EngineRuntime;
  candidateFilter?: (action: EngineAction) => boolean;
};

export type SolveDecisionResult = {
  decisions: EngineDecision[];
  trace: EngineDecisionTrace;
  exclusions: EngineExclusions;
  capabilities: EngineRuntimeMetadata['capabilities'];
  degraded: EngineRuntimeMetadata['degraded'];
  legacyDecision?: LegacyEngineDecision;
};

type EngineLogKind = 'validation' | 'unexpected';

function logEngineError(runtime: EngineRuntime, kind: EngineLogKind, meta: unknown): void {
  if (!runtime.enableLogs) return;
  const logger = runtime.logger;
  if (logger === undefined) return;
  if (kind === 'validation') {
    logger.warn('[engine] validation/solve error', meta);
    return;
  }
  logger.error('[engine] unexpected solve error', meta);
}

export async function solveDecision(
  state: EngineState,
  ctx: EngineContext,
  options: SolveDecisionOptions = {}
): Promise<SolveDecisionResult> {
  const runtime = options.runtime != null ? options.runtime : DEFAULT_ENGINE_RUNTIME;
  const stateIssues = validateEngineState(state);
  const ctxIssues = validateEngineContext(ctx);

  if (stateIssues.length > 0 || ctxIssues.length > 0) {
    throw new EngineError(
      `Engine validation failed: ${stateIssues.length} state issues, ${ctxIssues.length} context issues`
    );
  }

  let weights: ObjectiveWeights;
  try {
    const baseWeights = getObjectiveWeightsForState(state, runtime);
    weights = options.weights
      ? normalizeObjectiveWeights({ ...baseWeights, ...options.weights })
      : baseWeights;
  } catch (err: unknown) {
    const appError = asAppError(err);
    logEngineError(runtime, 'unexpected', {
      userId: state.userId,
      err: appError,
      context: 'resolve_weights',
    });
    weights = options.weights
      ? normalizeObjectiveWeights({ ...DEFAULT_OBJECTIVE_WEIGHTS, ...options.weights })
      : DEFAULT_OBJECTIVE_WEIGHTS;
  }

  const candidateActions = generateCandidateActions(state, ctx);
  const surfaceFilteredCandidates =
    options.candidateFilter != null
      ? candidateActions.filter((action) => options.candidateFilter?.(action) === true)
      : candidateActions;
  // PR8.3 intentionally counts exclusions from the surface-filtered generated set before
  // hard filtering and before score sorting. This is a temporary coupling to pre-PR9
  // truncation behavior; PR9 may revise evaluation-order semantics.
  const exclusions = surfaceFilteredCandidates.reduce<EngineExclusions>((acc, action) => {
    if (!actionRequiresResolvableCreditLiability(action)) {
      return acc;
    }
    const card = findActionCard(state, action);
    if (card?.isCredit === true) {
      acc.creditActionsGeneratedCount += 1;
      if (hasUnresolvableCreditLiability(state, action)) {
        acc.creditUnresolvableLiabilityCount += 1;
      }
    }
    return acc;
  }, createEmptyEngineExclusions());
  const maxCandidates: number | null =
    options.maxCandidates !== null &&
    options.maxCandidates !== undefined &&
    !Number.isNaN(options.maxCandidates)
      ? options.maxCandidates
      : null;
  const constrainedCandidates =
    maxCandidates !== null && surfaceFilteredCandidates.length > maxCandidates
      ? surfaceFilteredCandidates.slice(0, maxCandidates)
      : surfaceFilteredCandidates;

  const decisions: EngineDecision[] = [];
  const hardConstraints = getHardConstraints(state);

  for (const action of constrainedCandidates) {
    const projections = simulateAction(state, ctx, action);
    const { score, reasons, components } = scoreDecision(state, ctx, action, projections, weights);
    const constraintTags = evaluateConstraintsForDecision(state, ctx, action, projections);

    for (const constraint of hardConstraints) {
      constraintTags.push(formatConstraintTag(constraint.severity, constraint.id));
    }

    decisions.push({
      actionId: buildActionId(action),
      action,
      score,
      reasons,
      projections,
      constraintsBreached: constraintTags,
      components,
    });
  }

  const filtered = enforceHardConstraints(decisions).sort((a, b) => {
    const primary = b.score - a.score;
    if (primary !== 0) return primary;
    return a.actionId.localeCompare(b.actionId);
  });

  const trace: EngineDecisionTrace = {
    engineVersion: ENGINE_VERSION,
    weights,
    stateSummary: {
      bucketCount: state.buckets.length,
      cardCount: state.cards.length,
      debtCount: getDebtAccounts(state.debts).length,
    },
    contextSummary: {
      surface: ctx.surface,
      merchantCategoryKey: ctx.merchantCategoryKey == null ? null : ctx.merchantCategoryKey,
      amountCents: ctx.amountCents == null ? null : ctx.amountCents,
    },
    candidates: filtered.map((d) => ({
      action: d.action,
      score: d.score,
      constraintsBreached: d.constraintsBreached,
      ...(d.components ? { components: d.components } : {}),
    })),
  };
  const { capabilities, degraded } = getEngineRuntimeMetadata(state);

  let legacyDecision: LegacyEngineDecision | undefined;
  if (options.includeLegacyDecision === true) {
    if (options.legacyDecisionProvider === undefined) {
      throw new EngineError('legacyDecisionProvider required when includeLegacyDecision is true');
    }
    const parsedMcc =
      ctx.mcc != null && ctx.mcc !== ''
        ? Number.parseInt(String(ctx.mcc), 10)
        : null;

    legacyDecision = await options.legacyDecisionProvider({
      userId: state.userId,
      amountCents: ctx.amountCents == null ? 0 : ctx.amountCents,
      category: ctx.merchantCategoryKey == null ? null : ctx.merchantCategoryKey,
      merchantName: ctx.merchantName == null ? null : ctx.merchantName,
      mccCode: Number.isInteger(parsedMcc) ? parsedMcc : null,
      nowMs: ctx.nowMs,
    });
  }

  const result: SolveDecisionResult = {
    decisions: filtered,
    trace,
    exclusions,
    capabilities,
    degraded,
  };
  if (legacyDecision !== undefined) {
    result.legacyDecision = legacyDecision;
  }

  return result;
}

export type SafeDecisionOutcome =
  | {
      ok: true;
      decisions: EngineDecisionWithAccounting[];
      trace: EngineDecisionTrace;
      exclusions: EngineExclusions;
      capabilities: EngineRuntimeMetadata['capabilities'];
      degraded: EngineRuntimeMetadata['degraded'];
      legacyDecision?: LegacyEngineDecision;
      state: EngineState;
    }
  | {
      ok: false;
      reason: 'VALIDATION_ERROR' | 'ENGINE_ERROR';
      message: string;
      capabilities: EngineRuntimeMetadata['capabilities'];
      degraded: EngineRuntimeMetadata['degraded'];
    };

export async function safeSolveDecisionForUser(
  userId: string,
  ctx: EngineContext,
  options: SolveDecisionOptions = {}
): Promise<SafeDecisionOutcome> {
  const runtimeMetadata = getEngineRuntimeMetadata(options.stateOverride);
  try {
    const runtime = options.runtime != null ? options.runtime : DEFAULT_ENGINE_RUNTIME;
    const state = options.stateOverride;
    if (state === undefined) {
      throw new EngineError('safeSolveDecisionForUser requires a stateOverride');
    }
    const { decisions, trace, exclusions, capabilities, degraded, legacyDecision } = await solveDecision(
      state,
      ctx,
      {
      ...options,
      includeLegacyDecision:
        options.includeLegacyDecision == null ? true : options.includeLegacyDecision,
      runtime,
      }
    );
    const snapshot = buildAccountingSnapshot(state, ctx.nowMs);
    const provedDecisions = attachAccountingProof({ decisions, ctx, snapshot });
    const safeDecisions = filterAccountingSafeDecisions(provedDecisions);
    const successResult: SafeDecisionOutcome = {
      ok: true,
      decisions: safeDecisions,
      trace,
      exclusions,
      capabilities,
      degraded,
      state,
    };
    if (legacyDecision !== undefined) {
      successResult.legacyDecision = legacyDecision;
    }
    return successResult;
  } catch (err: unknown) {
    const appError = asAppError(err);
    const runtime = options.runtime != null ? options.runtime : DEFAULT_ENGINE_RUNTIME;
    if (err instanceof EngineError) {
      logEngineError(runtime, 'validation', { userId, err });
      return {
        ok: false,
        reason: 'VALIDATION_ERROR',
        message: err.message,
        ...runtimeMetadata,
      };
    }

    logEngineError(runtime, 'unexpected', { userId, err: appError });
    return {
      ok: false,
      reason: 'ENGINE_ERROR',
      message: 'Engine failed unexpectedly',
      ...runtimeMetadata,
    };
  }
}

function buildActionId(action: EngineAction): string {
  switch (action.type) {
    case 'USE_CARD':
      return `use_card:${action.cardId == null ? 'unknown' : action.cardId}`;
    case 'USE_CARD_WITH_PAYDOWN':
      return `use_card_with_paydown:${action.cardId == null ? 'unknown' : action.cardId}:${
        action.debtId == null ? 'none' : action.debtId
      }`;
    case 'PAY_DOWN_DEBT':
      return `pay_down_debt:${action.debtId == null ? 'unknown' : action.debtId}`;
    case 'SWITCH_MERCHANT':
      return `switch_merchant:${
        action.altMerchantCategoryKey == null ? 'unknown' : action.altMerchantCategoryKey
      }`;
    case 'DELAY_PURCHASE':
      return `delay_purchase:${action.delayDays == null ? 0 : action.delayDays}`;
    case 'REJECT_PURCHASE':
      return 'reject_purchase';
    default:
      return 'unknown';
  }
}
