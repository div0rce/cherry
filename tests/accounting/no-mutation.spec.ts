/**
 * PROVES:
 * - A4: Ledger immutability (append-only)
 *
 * PRE-EXISTING TEST (RETROFITTED)
 *
 * ASSUMPTIONS:
 * - Ledger events are applied in a single deterministic order.
 *
 * STATE SPACE:
 * - Varies: generated event streams
 * - Fixed: ledger currency and account setup
 */
import * as assert from 'node:assert/strict';
import { applyLedgerEvent, createLedgerState } from '../../lib/accounting/ledger.js';
import { generateEventStream } from './harness.js';

const seed = 20260131;
const eventCount = Number.parseInt(process.env['CHERRY_ACCOUNTING_MUTATION_EVENT_COUNT'] ?? '60', 10);

const run = generateEventStream(seed, eventCount);
let state = createLedgerState(run.accounts, run.currency);

for (const event of run.events) {
  const prevTxns = state.txns;
  const next = applyLedgerEvent(state, event);
  assert.equal(next.txns.length >= prevTxns.length, true, 'txn history shrank');
  for (let i = 0; i < prevTxns.length; i += 1) {
    assert.equal(next.txns[i], prevTxns[i], 'txn history mutated');
  }
  state = next;
}

console.warn('accounting no-mutation: ok');
