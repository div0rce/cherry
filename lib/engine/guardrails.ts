import type {
  EngineConstraint,
  EngineConstraintSeverity,
  EngineContext,
  EngineDecision,
  EngineUserState,
  EngineValidationIssue,
} from './types';

export class EngineError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'EngineError';
  }
}

export function validateEngineUserState(state: EngineUserState): EngineValidationIssue[] {
  const issues: EngineValidationIssue[] = [];

  if (!state.userId) {
    issues.push({ field: 'userId', message: 'Missing userId in EngineUserState' });
  }

  if (!Number.isFinite(state.preferences.rewardsWeight)) {
    issues.push({ field: 'preferences.rewardsWeight', message: 'Invalid rewardsWeight' });
  }

  if (!Number.isFinite(state.preferences.runwayWeight)) {
    issues.push({ field: 'preferences.runwayWeight', message: 'Invalid runwayWeight' });
  }

  for (const bucket of state.buckets) {
    if (bucket.balanceCents < 0) {
      issues.push({ field: `bucket:${bucket.id}`, message: 'Negative bucket balanceCents' });
    }
    if (bucket.limitCents != null && bucket.limitCents < 0) {
      issues.push({ field: `bucket:${bucket.id}`, message: 'Negative bucket limitCents' });
    }
  }

  for (const card of state.cards) {
    if (!card.id) {
      issues.push({ field: 'card.id', message: 'Card is missing id' });
    }
    for (const rule of card.rewards) {
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

export function getHardConstraints(state: EngineUserState): EngineConstraint[] {
  const constraints: EngineConstraint[] = [];

  if (state.cash.liquidCents != null && state.cash.liquidCents < 0) {
    constraints.push({
      id: 'NEGATIVE_LIQUID',
      description: 'User has negative liquid balance',
      severity: 'HARD',
    });
  }

  return constraints;
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
