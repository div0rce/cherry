import { logError, logWarn } from '@/lib/logger';

export type GuardrailSurface =
  | 'scan'
  | 'simulate'
  | 'vine'
  | 'simulations'
  | 'signin'
  | 'rewards';

export type GuardrailOutcome = 'OK' | 'WARN' | 'BLOCK' | 'FALLBACK';

export function logGuardrailEvent(event: {
  userId: string | null;
  surface: GuardrailSurface;
  outcome: GuardrailOutcome;
  reason: string;
  detail?: unknown;
}): void {
  logWarn('Guardrail event', { ...event, timestamp: new Date().toISOString() });
}

export function logInvariantViolation(event: { surface: string; detail: string; data?: unknown }): void {
  logError('Invariant violation', { ...event, timestamp: new Date().toISOString() });
}
