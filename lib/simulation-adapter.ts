import type { EngineDecision, EngineInput } from './engine';

export type RunSimulationInput = EngineInput;

export type RunSimulationResult = {
  decision: EngineDecision;
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
  overrides?: { runEngineFn?: (i: EngineInput) => Promise<EngineDecision> }
): Promise<RunSimulationResult> {
  const runner =
    overrides?.runEngineFn ??
    (await import('./engine')).runEngine;
  const decision = await runner(input);
  return { decision };
}
