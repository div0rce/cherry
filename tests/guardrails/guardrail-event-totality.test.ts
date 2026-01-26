import { logGuardrailEvent } from '../../lib/log.js';

const timestamp = new Date(0).toISOString();

logGuardrailEvent({
  userId: null,
  surface: 'scan',
  outcome: 'OK',
  reason: 'GUARDRAIL_TOTALITY_OK',
  timestamp,
  timestampSource: 'client',
});

if (false) {
  // @ts-expect-error timestamp is required
  logGuardrailEvent({
    userId: null,
    surface: 'scan',
    outcome: 'STOP',
    reason: 'MISSING_TIMESTAMP',
    timestampSource: 'client',
  });

  // @ts-expect-error timestampSource is required
  logGuardrailEvent({
    userId: null,
    surface: 'scan',
    outcome: 'STOP',
    reason: 'MISSING_TIMESTAMP_SOURCE',
    timestamp,
  });
}

process.stdout.write('guardrail-event-totality-ok\n');
