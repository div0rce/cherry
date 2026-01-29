import type { LegacyEngineInput, LegacyEngineDecision } from './engine.js';

export type RunSimulationInput = LegacyEngineInput;

export type RunSimulationResult = {
  decision: LegacyEngineDecision;
};

/**
 * runSimulation
 *
 * Thin wrapper around the canonical engine for sandbox simulations.
 * - Calls runEngine with the same inputs used for real decisions.
 * - Does NOT mutate buckets, sessions, or ledger.
 * - The caller may persist a SimulatedTransaction for history.
 */
export async function runSimulation(
  input: RunSimulationInput,
  overrides?: { runEngineFn?: (i: LegacyEngineInput) => Promise<LegacyEngineDecision> }
): Promise<RunSimulationResult> {
  if (input.nowMs == null || Number.isNaN(input.nowMs)) {
    throw new Error('runSimulation requires explicit `nowMs`');
  }
  const runner =
    overrides?.runEngineFn ??
    (await import('./engine.js')).runEngine;
  const decision = await runner(input);
  return { decision };
}
