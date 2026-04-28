import { SIMULATION_DRIFT_CLASSIFIER_VERSION } from './types.js';

export type SimulationSnapshot = {
  score?: number;
  allocation?: Record<string, number>;
  strategy?: string | null;
  paydownStrategy?: string | null;
  runwayDays?: number;
  runway?: number;
  viableCandidates?: unknown[];
  viableCandidateCount?: number;
};

export type SimulationDriftClassification = {
  classifierVersion: typeof SIMULATION_DRIFT_CLASSIFIER_VERSION;
  drift: boolean;
  reasons: string[];
  scoreDelta: number;
  allocationDelta: number;
  strategyFlip: boolean;
  runwayCollapse: boolean;
  emptyViableCandidates: boolean;
};

function numeric(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function normalizeSnapshot(snapshot: SimulationSnapshot) {
  const strategy = snapshot.strategy ?? snapshot.paydownStrategy ?? null;
  const runwayDays = numeric(snapshot.runwayDays ?? snapshot.runway);
  const allocation = snapshot.allocation ?? {};
  const viableCandidates = Array.isArray(snapshot.viableCandidates)
    ? snapshot.viableCandidates.length
    : numeric(snapshot.viableCandidateCount);

  return {
    score: numeric(snapshot.score),
    allocation,
    strategy,
    runwayDays,
    viableCandidates,
  };
}

export function classifySimulationDrift(
  previousSnapshot: SimulationSnapshot | null,
  currentSnapshot: SimulationSnapshot
): SimulationDriftClassification {
  const current = normalizeSnapshot(currentSnapshot);
  const previous = previousSnapshot === null ? null : normalizeSnapshot(previousSnapshot);
  const reasons: string[] = [];

  const scoreDelta =
    previous === null ? 0 : Math.abs(current.score - previous.score);
  let allocationDelta = 0;
  if (previous !== null) {
    const allocationKeys = new Set([
      ...Object.keys(previous.allocation).sort((a, b) => a.localeCompare(b)),
      ...Object.keys(current.allocation).sort((a, b) => a.localeCompare(b)),
    ]);
    for (const key of allocationKeys) {
      allocationDelta += Math.abs(
        numeric(current.allocation[key]) - numeric(previous.allocation[key])
      );
    }
  }
  const strategyFlip = previous !== null && current.strategy !== previous.strategy;
  const runwayCollapse =
    previous !== null &&
    current.runwayDays < Math.max(7, previous.runwayDays * 0.5);
  const emptyViableCandidates = current.viableCandidates === 0;

  if (scoreDelta >= 10) reasons.push(`score_delta:${scoreDelta}`);
  if (allocationDelta >= 5_000) reasons.push(`allocation_delta:${allocationDelta}`);
  if (strategyFlip) reasons.push('strategy_flip');
  if (runwayCollapse) reasons.push('runway_collapse');
  if (emptyViableCandidates) reasons.push('empty_viable_candidates');

  return {
    classifierVersion: SIMULATION_DRIFT_CLASSIFIER_VERSION,
    drift: reasons.length > 0,
    reasons,
    scoreDelta,
    allocationDelta,
    strategyFlip,
    runwayCollapse,
    emptyViableCandidates,
  };
}
