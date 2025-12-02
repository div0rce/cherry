import type {
  EngineAction,
  EngineConstraint,
  EngineConstraintSeverity,
  EngineContext,
  EngineDecision,
  EngineState,
  EngineValidationIssue,
} from './types';

export class EngineError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'EngineError';
  }
}

export function validateEngineState(state: EngineState): EngineValidationIssue[] {
  const issues: EngineValidationIssue[] = [];

  if (!state.userId) {
    issues.push({ field: 'userId', message: 'Missing userId in EngineState' });
  }

  for (const bucket of state.buckets) {
    if (bucket.spentCents < 0) {
      issues.push({ field: `bucket:${bucket.id}`, message: 'Negative bucket spentCents' });
    }
    if (bucket.limitCents != null && bucket.limitCents < 0) {
      issues.push({ field: `bucket:${bucket.id}`, message: 'Negative bucket limitCents' });
    }
  }

  for (const card of state.cards) {
    if (!card.id) {
      issues.push({ field: 'card.id', message: 'Card is missing id' });
    }
    for (const rule of card.rewardRules) {
      if (!Number.isFinite(rule.rateValue)) {
        issues.push({ field: `card:${card.id}:reward`, message: 'Non-finite reward rate' });
      }
    }
  }

  return issues;
}

export function validateEngineContext(ctx: EngineContext): EngineValidationIssue[] {
  const issues: EngineValidationIssue[] = [];

  if (ctx.amountCents != null && ctx.amountCents < 0) {
    issues.push({ field: 'amountCents', message: 'Negative amountCents' });
  }

  return issues;
}

export function getHardConstraints(state: EngineState): EngineConstraint[] {
  const constraints: EngineConstraint[] = [];

  if (state.cash?.liquidCents != null && state.cash.liquidCents < 0) {
    constraints.push({
      id: 'NEGATIVE_LIQUID',
      description: 'User has negative liquid balance',
      severity: 'HARD',
    });
  }

  return constraints;
}

export function evaluateConstraintsForDecision(
  state: EngineState,
  ctx: EngineContext,
  action: EngineAction,
  projections: EngineDecision['projections']
): string[] {
  const breaches: string[] = [];

  for (const proj of projections.buckets) {
    const bucket = state.buckets.find((b) => b.id === proj.bucketId);
    if (!bucket) continue;
    if (bucket.isEssential && bucket.limitCents != null && proj.projectedSpentCents > bucket.limitCents) {
      breaches.push('HARD:ESSENTIAL_BUCKET_OVER_LIMIT');
    }
  }

  if (state.constraints.hard.maxCardUtilization != null) {
    for (const proj of projections.debt) {
      if (
        proj.projectedUtilization != null &&
        proj.projectedUtilization > state.constraints.hard.maxCardUtilization
      ) {
        breaches.push('HARD:UTILIZATION_THRESHOLD_EXCEEDED');
      }
    }
  }

  const amount = ctx.amountCents ?? 0;

  if (
    (action.type === 'PAY_DOWN_DEBT' || action.type === 'USE_CARD_WITH_PAYDOWN') &&
    action.paydownAmountCents
  ) {
    const liquid = state.cash?.liquidCents ?? null;
    if (liquid != null && liquid < action.paydownAmountCents) {
      breaches.push('HARD:PAYDOWN_EXCEEDS_LIQUID');
    }
  }

  if (
    (action.type === 'DELAY_PURCHASE' || action.type === 'REJECT_PURCHASE') &&
    ctx.merchantCategoryKey
  ) {
    const essentialBucket = state.buckets.find(
      (bucket) => bucket.categoryKey === ctx.merchantCategoryKey && bucket.isEssential
    );
    if (essentialBucket && essentialBucket.limitCents != null) {
      const margin = essentialBucket.limitCents - essentialBucket.spentCents - amount;
      if (margin >= 0) {
        breaches.push('SOFT:ESSENTIAL_PURCHASE_DELAY');
      }
    }
  }

  return breaches;
}

export function enforceHardConstraints(decisions: EngineDecision[]): EngineDecision[] {
  return decisions.filter((decision) =>
    decision.constraintsBreached.every((c) => !isHardConstraintTag(c))
  );
}

export function formatConstraintTag(
  severity: EngineConstraintSeverity,
  id: string
): string {
  return `${severity}:${id}`;
}

function isHardConstraintTag(tag: string): boolean {
  return tag.startsWith('HARD:');
}
