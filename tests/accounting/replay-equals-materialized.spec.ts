import * as assert from 'node:assert/strict';
import { applyLedgerEvent, createLedgerState, replayLedgerEvents } from '../../lib/accounting/ledger';
import { generateEventStream, snapshotLedger } from './harness';

const seeds = [20260121, 20260122, 20260123];
const eventCount = Number.parseInt(process.env['CHERRY_ACCOUNTING_REPLAY_EVENT_COUNT'] ?? '80', 10);

for (const seed of seeds) {
  const run = generateEventStream(seed, eventCount);
  let state = createLedgerState(run.accounts, run.currency);
  for (const event of run.events) {
    state = applyLedgerEvent(state, event);
  }
  const replayed = replayLedgerEvents(run.accounts, run.currency, run.events);
  assert.deepEqual(
    snapshotLedger(replayed),
    snapshotLedger(state),
    `replay mismatch for seed=${seed}`
  );
}

console.log('accounting replay: ok');
