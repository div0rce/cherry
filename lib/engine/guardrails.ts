import type {
  EngineAction,
  EngineConstraint,
  EngineConstraintSeverity,
  EngineContext,
  EngineDecision,
  EngineState,
  EngineValidationIssue,
} from './types';

function hasNonEmptyString(value?: string | null): value is string {
  return value !== undefined && value !== null && value !== '';
}

export class EngineError extends Error {
  constructor(message: string, public override readonly cause?: unknown) {
    super(message);
    this.name = 'EngineError';
  }
}

export function validateEngineState(state: EngineState): EngineValidationIssue[] {
  const issues: EngineValidationIssue[] = [];

  if (!hasNonEmptyString(state.userId)) {
    issues.push({ field: 'userId', message: 'Missing userId in EngineState' });
  }

  for (const bucket of state.buckets) {
    if (bucket.postedSpendCents < 0) {
      issues.push({ field: `bucket:${bucket.id}`, message: 'Negative bucket postedSpendCents' });
    }
    if (bucket.pendingSpendCents < 0) {
      issues.push({ field: `bucket:${bucket.id}`, message: 'Negative bucket pendingSpendCents' });
    }
    if (bucket.limitCents != null && bucket.limitCents < 0) {
      issues.push({ field: `bucket:${bucket.id}`, message: 'Negative bucket limitCents' });
    }
    const expectedCommitted = bucket.postedSpendCents + bucket.pendingSpendCents;
    if (bucket.committedCents !== expectedCommitted) {
      issues.push({ field: `bucket:${bucket.id}`, message: 'Bucket committedCents mismatch' });
    }
    const expectedRemaining =
      bucket.limitCents != null ? Math.max(0, bucket.limitCents - expectedCommitted) : 0;
    if (bucket.limitCents != null && bucket.remainingCents !== expectedRemaining) {
      issues.push({ field: `bucket:${bucket.id}`, message: 'Bucket remainingCents mismatch' });
    }
  }

  for (const card of state.cards) {
    if (!hasNonEmptyString(card.id)) {
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
    if (
      bucket.isEssential &&
      bucket.limitCents != null &&
      proj.projectedCommittedCents > bucket.limitCents
    ) {
      breaches.push('HARD:ESSENTIAL_BUCKET_OVER_LIMIT');
    }
    if (
      bucket.strictMode &&
      bucket.limitCents != null &&
      proj.projectedCommittedCents > bucket.limitCents
    ) {
      breaches.push('HARD:STRICT_BUCKET_OVER_LIMIT');
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
    action.paydownAmountCents !== null &&
    action.paydownAmountCents !== undefined &&
    !Number.isNaN(action.paydownAmountCents) &&
    action.paydownAmountCents !== 0
  ) {
    const liquid = state.cash?.liquidCents ?? null;
    if (liquid != null && liquid < action.paydownAmountCents) {
      breaches.push('HARD:PAYDOWN_EXCEEDS_LIQUID');
    }
  }

  if (
    (action.type === 'DELAY_PURCHASE' || action.type === 'REJECT_PURCHASE') &&
    hasNonEmptyString(ctx.merchantCategoryKey)
  ) {
    const essentialBucket = state.buckets.find(
      (bucket) => bucket.categoryKey === ctx.merchantCategoryKey && bucket.isEssential
    );
    if (essentialBucket && essentialBucket.limitCents != null) {
      const margin = essentialBucket.remainingCents - amount;
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
