import { runEngine, type EngineDecision as LegacyEngineDecision } from './legacy';
import { generateCandidateActions } from './candidates';
import { simulateAction } from './simulate';
import { scoreDecision, DEFAULT_OBJECTIVE_WEIGHTS } from './objective';
import {
  EngineError,
  enforceHardConstraints,
  evaluateConstraintsForDecision,
  formatConstraintTag,
  getHardConstraints,
  validateEngineContext,
  validateEngineState,
} from './guardrails';
import { ENGINE_VERSION, fromPrismaUserToEngineState } from './context';
import type {
  EngineAction,
  EngineContext,
  EngineDecision,
  EngineDecisionTrace,
  EngineState,
  ObjectiveWeights,
} from './types';

export type SolveDecisionOptions = {
  weights?: Partial<ObjectiveWeights>;
  maxCandidates?: number;
  includeLegacyDecision?: boolean;
  stateOverride?: EngineState;
};

export type SolveDecisionResult = {
  decisions: EngineDecision[];
  trace: EngineDecisionTrace;
  legacyDecision?: LegacyEngineDecision;
};

type EngineLogKind = 'validation' | 'unexpected';

function logEngineError(kind: EngineLogKind, meta: unknown): void {
  if (process.env.NODE_ENV === 'test') return;
  if (kind === 'validation') {
    console.warn('[engine] validation/solve error', meta);
    return;
  }
  console.error('[engine] unexpected solve error', meta);
}

export async function solveDecision(
  state: EngineState,
  ctx: EngineContext,
  options: SolveDecisionOptions = {}
): Promise<SolveDecisionResult> {
  const stateIssues = validateEngineState(state);
  const ctxIssues = validateEngineContext(ctx);

  if (stateIssues.length > 0 || ctxIssues.length > 0) {
    throw new EngineError(
      `Engine validation failed: ${stateIssues.length} state issues, ${ctxIssues.length} context issues`
    );
  }

  const weights: ObjectiveWeights = {
    ...DEFAULT_OBJECTIVE_WEIGHTS,
    ...options.weights,
  };

  const candidateActions = generateCandidateActions(state, ctx);
  const constrainedCandidates =
    options.maxCandidates && candidateActions.length > options.maxCandidates
      ? candidateActions.slice(0, options.maxCandidates)
      : candidateActions;

  const decisions: EngineDecision[] = [];
  const hardConstraints = getHardConstraints(state);

  for (const action of constrainedCandidates) {
    const projections = simulateAction(state, ctx, action);
    const { score, reasons } = scoreDecision(state, ctx, action, projections, weights);
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
    });
  }

  const filtered = enforceHardConstraints(decisions).sort((a, b) => b.score - a.score);

  const trace: EngineDecisionTrace = {
    engineVersion: ENGINE_VERSION,
    weights,
    stateSummary: {
      bucketCount: state.buckets.length,
      cardCount: state.cards.length,
      debtCount: state.debts.length,
    },
    contextSummary: {
      surface: ctx.surface,
      merchantCategoryKey: ctx.merchantCategoryKey ?? null,
      amountCents: ctx.amountCents ?? null,
    },
    candidates: filtered.map((d) => ({
      action: d.action,
      score: d.score,
      constraintsBreached: d.constraintsBreached,
    })),
  };

  let legacyDecision: LegacyEngineDecision | undefined;
  if (options.includeLegacyDecision) {
    const parsedMcc =
      ctx.mcc != null && ctx.mcc !== ''
        ? Number.parseInt(String(ctx.mcc), 10)
        : null;

    legacyDecision = await runEngine({
      userId: state.userId,
      amountCents: ctx.amountCents ?? 0,
      category: ctx.merchantCategoryKey ?? null,
      merchantName: ctx.merchantName ?? null,
      mccCode: Number.isInteger(parsedMcc) ? parsedMcc : null,
      now: ctx.now,
    });
  }

  const result: SolveDecisionResult = { decisions: filtered, trace };
  if (legacyDecision) {
    result.legacyDecision = legacyDecision;
  }

  return result;
}

export type SafeDecisionOutcome =
  | {
      ok: true;
      decisions: EngineDecision[];
      trace: EngineDecisionTrace;
      legacyDecision?: LegacyEngineDecision;
      state: EngineState;
    }
  | { ok: false; reason: 'VALIDATION_ERROR' | 'ENGINE_ERROR'; message: string };

export async function safeSolveDecisionForUser(
  userId: string,
  ctx: EngineContext,
  options: SolveDecisionOptions = {}
): Promise<SafeDecisionOutcome> {
  try {
    const state = options.stateOverride ?? (await fromPrismaUserToEngineState(userId));
    const { decisions, trace, legacyDecision } = await solveDecision(state, ctx, {
      ...options,
      includeLegacyDecision: options.includeLegacyDecision ?? true,
    });
    const successResult: SafeDecisionOutcome = { ok: true, decisions, trace, state };
    if (legacyDecision) {
      successResult.legacyDecision = legacyDecision;
    }
    return successResult;
  } catch (err) {
    if (err instanceof EngineError) {
      logEngineError('validation', { userId, err });
      return {
        ok: false,
        reason: 'VALIDATION_ERROR',
        message: err.message,
      };
    }

    logEngineError('unexpected', { userId, err });
    return {
      ok: false,
      reason: 'ENGINE_ERROR',
      message: 'Engine failed unexpectedly',
    };
  }
}

function buildActionId(action: EngineAction): string {
  switch (action.type) {
    case 'USE_CARD':
      return `use_card:${action.cardId ?? 'unknown'}`;
    case 'USE_CARD_WITH_PAYDOWN':
      return `use_card_with_paydown:${action.cardId ?? 'unknown'}:${action.debtId ?? 'none'}`;
    case 'PAY_DOWN_DEBT':
      return `pay_down_debt:${action.debtId ?? 'unknown'}`;
    case 'SWITCH_MERCHANT':
      return `switch_merchant:${action.altMerchantCategoryKey ?? 'unknown'}`;
    case 'DELAY_PURCHASE':
      return `delay_purchase:${action.delayDays ?? 0}`;
    case 'REJECT_PURCHASE':
      return 'reject_purchase';
    default:
      return 'unknown';
  }
}
