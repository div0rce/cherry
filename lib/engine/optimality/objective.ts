import { getObjectiveWeightsForState, scoreAction } from '../objective.js';
import { simulateAction } from '../simulate.js';
import type { EngineContext, EngineState } from '../types.js';
import type { Candidate } from './candidates.js';
import { candidateKey, normalizeCandidate, normalizeCandidateToAction } from './normalize.js';

export const objectiveVersion = 'objective_v1' as const;

export type ObjectiveVector = Readonly<{
  scoreKey: string;
  candidateKey: string;
}>;

const ORDER_MASK = 0xffffffffffffffffn;
const SIGN_MASK = 0x8000000000000000n;

function scoreToOrderedKey(value: number): string {
  let resolved = value;
  if (!Number.isFinite(resolved)) {
    throw new Error(`Non-finite engine score: ${String(resolved)}`);
  }
  if (Object.is(resolved, -0)) {
    resolved = 0;
  }

  // Convert the IEEE-754 score into an order-preserving hex key.
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setFloat64(0, resolved, false);
  const bits = view.getBigUint64(0, false);
  const sign = bits & SIGN_MASK;
  const ordered = sign !== 0n ? (~bits & ORDER_MASK) : (bits | SIGN_MASK);
  return ordered.toString(16).padStart(16, '0');
}

export function scoreVector(
  candidate: Candidate,
  state: EngineState,
  ctx: EngineContext
): ObjectiveVector {
  const normalized = normalizeCandidate(candidate);
  const action = normalizeCandidateToAction(normalized);
  const projections = simulateAction(state, ctx, action);
  const weights = getObjectiveWeightsForState(state);
  const { score } = scoreAction(state, ctx, action, projections, weights);

  return {
    scoreKey: scoreToOrderedKey(score),
    candidateKey: candidateKey(normalized),
  };
}

export function compareObjective(
  a: ObjectiveVector,
  b: ObjectiveVector
): -1 | 0 | 1 {
  if (a.scoreKey !== b.scoreKey) {
    return a.scoreKey > b.scoreKey ? -1 : 1;
  }
  if (a.candidateKey !== b.candidateKey) {
    return a.candidateKey < b.candidateKey ? -1 : 1;
  }
  return 0;
}
