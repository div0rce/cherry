import { logError, logWarn } from './logger';

export type GuardrailSurface =
  | 'scan'
  | 'simulate'
  | 'vine'
  | 'simulations'
  | 'signin'
  | 'rewards'
  | 'autopilot';

export type GuardrailOutcome = 'OK' | 'WARN' | 'STOP' | 'FALLBACK';

export type AutopilotGuardrailKind = 'INPUT_INVALID' | 'DECISION_BLOCKED' | 'ENGINE_ERROR';

type LegacyGuardrailEvent = {
  userId: string | null;
  surface: Exclude<GuardrailSurface, 'autopilot'>;
  outcome: GuardrailOutcome;
  reason: string;
  detail?: unknown;
};

type AutopilotGuardrailEvent = {
  userId: string | null;
  surface: 'autopilot';
  kind: AutopilotGuardrailKind;
  severity: 'soft' | 'hard';
  reason?: string;
  detail?: unknown;
};

type GuardrailEvent = LegacyGuardrailEvent | AutopilotGuardrailEvent;

function mapKindToOutcome(kind: AutopilotGuardrailKind): GuardrailOutcome {
  if (kind === 'DECISION_BLOCKED') return 'STOP';
  if (kind === 'ENGINE_ERROR') return 'FALLBACK';
  return 'WARN';
}

export function logGuardrailEvent(event: GuardrailEvent): void {
  if (event.surface === 'autopilot') {
    const normalized = {
      userId: event.userId,
      surface: event.surface,
      kind: event.kind,
      severity: event.severity,
      outcome: mapKindToOutcome(event.kind),
      reason: event.reason ?? event.kind,
      detail: event.detail,
    };
    logWarn('Guardrail event', { ...normalized, timestamp: 'not_recorded' });
    return;
  }

  logWarn('Guardrail event', { ...event, timestamp: 'not_recorded' });
}

export function logInvariantViolation(event: { surface: string; detail: string; data?: unknown }): void {
  logError('Invariant violation', { ...event, timestamp: 'not_recorded' });
}
