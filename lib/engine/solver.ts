import { runEngine, type EngineDecision as LegacyEngineDecision } from './legacy';
import {
  DEFAULT_OBJECTIVE_WEIGHTS,
  combineScores,
  scoreComponents,
} from './objective';
import {
  EngineError,
  enforceHardConstraints,
  formatConstraintTag,
  getHardConstraints,
  validateEngineContext,
  validateEngineUserState,
} from './guardrails';
import { ENGINE_VERSION, buildEngineUserState } from './context';
import type {
  EngineAction,
  EngineContext,
  EngineDecision,
  EngineDecisionTrace,
  EngineUserState,
  ObjectiveWeights,
} from './types';

// Generate candidate actions (currently one USE_CARD per eligible card).
export function generateCandidateActions(
  state: EngineUserState,
  legacyDecision?: LegacyEngineDecision
): EngineAction[] {
  const actions: EngineAction[] = [];

  for (const card of state.cards) {
    if (!card.canUseForContext) continue;
    actions.push({
      type: 'USE_CARD',
      id: `use_card:${card.id}`,
      cardId: card.id,
    });
  }

  if (legacyDecision?.card.cardId && !actions.some((a) => a.cardId === legacyDecision.card.cardId)) {
    actions.push({
      type: 'USE_CARD',
      id: `use_card:${legacyDecision.card.cardId}`,
      cardId: legacyDecision.card.cardId,
    });
  }

  if (actions.length === 0) {
    actions.push({ type: 'DELAY_PURCHASE', id: 'delay_purchase:default', delayDays: 1 });
  }

  return actions;
}

export type SolveDecisionOptions = {
  weights?: Partial<ObjectiveWeights>;
  maxCandidates?: number;
  legacyEngineFn?: typeof runEngine;
  stateOverride?: EngineUserState;
};

export type SolveDecisionResult = {
  decisions: EngineDecision[];
  trace: EngineDecisionTrace;
  legacyDecision: LegacyEngineDecision;
};

export async function solveDecision(
  state: EngineUserState,
  ctx: EngineContext,
  options: SolveDecisionOptions = {}
): Promise<SolveDecisionResult> {
  const stateIssues = validateEngineUserState(state);
  const ctxIssues = validateEngineContext(ctx);

  if (stateIssues.length > 0 || ctxIssues.length > 0) {
    throw new EngineError(
      `Engine validation failed: ${stateIssues.length} state issues, ${ctxIssues.length} context issues`
    );
  }

  if (
    ctx.amountCents == null ||
    Number.isNaN(ctx.amountCents) ||
    ctx.amountCents <= 0
  ) {
    throw new EngineError('amountCents must be a positive number');
  }

  const parsedMcc =
    ctx.mcc != null && ctx.mcc !== ''
      ? Number.parseInt(String(ctx.mcc), 10)
      : null;

  const legacyRunner = options.legacyEngineFn ?? runEngine;

  const legacyDecision = await legacyRunner({
    userId: state.userId,
    amountCents: ctx.amountCents,
    category: ctx.merchantCategoryKey ?? null,
    merchantName: ctx.merchantName ?? null,
    mccCode: Number.isInteger(parsedMcc) ? parsedMcc : null,
    now: ctx.now,
  });

  const weights: ObjectiveWeights = {
    ...DEFAULT_OBJECTIVE_WEIGHTS,
    ...options.weights,
  };

  const candidateActions = generateCandidateActions(state, legacyDecision);
  const constrainedCandidates =
    options.maxCandidates && candidateActions.length > options.maxCandidates
      ? candidateActions.slice(0, options.maxCandidates)
      : candidateActions;

  const hardConstraints = getHardConstraints(state);

  const decisions: EngineDecision[] = [];

  for (const action of constrainedCandidates) {
    const components = scoreComponents(state, ctx, action);

    const constraintsBreached: string[] = [];

    if (
      action.type === 'USE_CARD' &&
      legacyDecision.budget.strictMode &&
      legacyDecision.budget.wouldExceed
    ) {
      constraintsBreached.push(formatConstraintTag('HARD', 'STRICT_BUCKET_DECLINE'));
    }

    for (const constraint of hardConstraints) {
      if (constraint.severity === 'HARD') {
        constraintsBreached.push(formatConstraintTag(constraint.severity, constraint.id));
      }
    }

    const score = combineScores(components, weights);

    decisions.push({
      action,
      score,
      components,
      constraintsBreached,
      projections: {
        buckets:
          legacyDecision.budget.bucketId != null
            ? [
                {
                  id: legacyDecision.budget.bucketId,
                  name: legacyDecision.budget.name ?? 'Bucket',
                  categoryKey: legacyDecision.category,
                  limitCents: legacyDecision.budget.limitCents ?? null,
                  balanceCents: legacyDecision.budget.spentAfterCents ?? 0,
                  period: 'MONTHLY',
                },
              ]
            : undefined,
        cash: state.cash,
        debts: state.debts,
      },
      explanationBullets: buildExplanationBullets(legacyDecision),
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
      merchantCategoryKey: ctx.merchantCategoryKey,
      amountCents: ctx.amountCents ?? null,
    },
    candidates: filtered.map((d) => ({
      action: d.action,
      components: d.components,
      score: d.score,
      constraintsBreached: d.constraintsBreached,
    })),
  };

  return { decisions: filtered, trace, legacyDecision };
}

export type SafeDecisionOutcome =
  | { ok: true; decisions: EngineDecision[]; trace: EngineDecisionTrace; legacyDecision: LegacyEngineDecision }
  | { ok: false; reason: 'VALIDATION_ERROR' | 'ENGINE_ERROR'; message: string };

export async function safeSolveDecisionForUser(
  userId: string,
  ctx: EngineContext,
  options: SolveDecisionOptions = {}
): Promise<SafeDecisionOutcome> {
  try {
    const state = options.stateOverride ?? (await buildEngineUserState(userId));
    const { decisions, trace, legacyDecision } = await solveDecision(state, ctx, options);
    return { ok: true, decisions, trace, legacyDecision };
  } catch (err) {
    if (err instanceof EngineError) {
      console.error('[engine] validation/solve error', { userId, err });
      return {
        ok: false,
        reason: 'VALIDATION_ERROR',
        message: err.message,
      };
    }

    console.error('[engine] unexpected error', { userId, err });
    return {
      ok: false,
      reason: 'ENGINE_ERROR',
      message: 'Engine failed unexpectedly',
    };
  }
}

function buildExplanationBullets(decision: LegacyEngineDecision): string[] {
  const bullets: string[] = [];

  if (decision.card.cardNickname && decision.card.multiplier != null) {
    bullets.push(
      `Use ${decision.card.cardNickname} for ${decision.card.multiplier}x rewards.`
    );
  } else if (decision.card.cardNickname) {
    bullets.push(`Use ${decision.card.cardNickname} for this purchase.`);
  }

  if (decision.budget.wouldExceed && decision.budget.strictMode) {
    bullets.push('Strict budget: this swipe would be declined.');
  } else if (decision.budget.wouldExceed) {
    bullets.push('This swipe exceeds your budget for this category.');
  }

  return bullets;
}
