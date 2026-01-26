import {
  enforceHardConstraints,
  evaluateConstraintsForDecision,
  formatConstraintTag,
  getHardConstraints,
} from '../guardrails.js';
import { simulateAction } from '../simulate.js';
import type { EngineContext, EngineDecision, EngineState } from '../types.js';
import type { Candidate } from './candidates.js';
import { candidateKey, normalizeCandidate, normalizeCandidateToAction } from './normalize.js';

export function isAdmissible(
  candidate: Candidate,
  state: EngineState,
  ctx: EngineContext
): boolean {
  const normalized = normalizeCandidate(candidate);
  const action = normalizeCandidateToAction(normalized);
  const projections = simulateAction(state, ctx, action);
  const constraintTags = evaluateConstraintsForDecision(state, ctx, action, projections);
  const hardConstraints = getHardConstraints(state);

  for (const constraint of hardConstraints) {
    constraintTags.push(formatConstraintTag(constraint.severity, constraint.id));
  }

  const decision: EngineDecision = {
    actionId: candidateKey(normalized),
    action,
    score: 0,
    reasons: [],
    projections,
    constraintsBreached: constraintTags,
  };

  return enforceHardConstraints([decision]).length > 0;
}
