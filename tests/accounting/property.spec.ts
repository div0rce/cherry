/**
 * PROVES:
 * - A1: Conservation of value
 * - A2: No fund creation or destruction
 * - A3: Double-entry completeness
 * - A4: Ledger immutability (append-only)
 * - A5: Deterministic replay
 * - A6: Idempotency under duplicate inputs
 * - A8: Monotonic ordering / time correctness
 * - A9: Materialized == replayed
 *
 * PRE-EXISTING TEST (RETROFITTED)
 *
 * ASSUMPTIONS:
 * - Event generator emits a valid account universe and currency.
 *
 * STATE SPACE:
 * - Varies: event streams, postings, external ids, effective times, seeds
 * - Fixed: ledger currency (USD), account definitions
 */
import * as assert from 'node:assert/strict';
import {
  applyLedgerEvent,
  asNonZeroAmount,
  balanceAt,
  computeBalances,
  createLedgerState,
  getTxnByExternalId,
  replayLedgerEvents,
  validateTransactionLike,
  validateLedgerState,
  type AccountId,
  type LedgerState,
} from '../../lib/accounting/ledger.js';
import { SeededRng, generateEventStream, snapshotLedger } from './harness.js';

const DEFAULT_FIXED_SEED = 20260113;
const DEFAULT_ROTATING_SEEDS = [20260114, 20260115, 20260116, 20260117];
const DEFAULT_EVENT_COUNT = 160;
const DEFAULT_TIME_CHECKS = 8;

function parseIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseSeedList(raw: string | undefined, fallback: number[]): number[] {
  if (raw === undefined || raw.trim().length === 0) return fallback;
  return raw
    .split(',')
    .map((token) => Number.parseInt(token.trim(), 10))
    .filter((value) => Number.isFinite(value));
}

function resolveSeeds(): number[] {
  const fixedSeed = parseIntEnv('CHERRY_ACCOUNTING_FIXED_SEED', DEFAULT_FIXED_SEED);
  const rotatingSeeds = parseSeedList(
    process.env['CHERRY_ACCOUNTING_ROTATING_SEEDS'],
    DEFAULT_ROTATING_SEEDS
  );
  if (rotatingSeeds.length === 0) {
    return [fixedSeed];
  }
  const rotation = parseIntEnv('CHERRY_ACCOUNTING_SEED_ROTATION', 0);
  const windowSize = Math.min(3, rotatingSeeds.length);
  const rotated: number[] = [];
  for (let i = 0; i < windowSize; i += 1) {
    const index = (rotation + i) % rotatingSeeds.length;
    const seed = requireSeed(rotatingSeeds, index);
    rotated.push(seed);
  }
  return [fixedSeed, ...rotated];
}

function serializeBalances(state: LedgerState): Array<{ accountId: string; balance: number }> {
  return [...state.balances.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([accountId, balance]) => ({ accountId, balance }));
}

function serializeExternalIndex(state: LedgerState): Array<{ externalId: string; txnId: string }> {
  return [...state.externalIndex.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([externalId, txnId]) => ({ externalId, txnId }));
}

function requireSeed(seeds: number[], index: number): number {
  const value = seeds[index];
  if (value === undefined) {
    throw new Error(`Missing seed at index ${index}`);
  }
  return value;
}

function sumPostingsAt(txns: LedgerState['txns'], accountId: AccountId, atMs: number): number {
  let total = 0;
  for (const txn of txns) {
    if (txn.effectiveAtMs > atMs) continue;
    for (const posting of txn.postings) {
      if (posting.accountId === accountId) {
        total += posting.amount;
      }
    }
  }
  return total;
}

function assertTimeBalances(state: LedgerState, seed: number): void {
  if (state.txns.length === 0) return;
  const times = state.txns.map((txn) => txn.effectiveAtMs);
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const rng = new SeededRng(seed ^ 0x9e3779b9);
  const accountIds = [...state.accounts.keys()];
  for (let i = 0; i < DEFAULT_TIME_CHECKS; i += 1) {
    const atMs = rng.int(minTime, maxTime);
    const accountId = rng.pick(accountIds);
    const expected = sumPostingsAt(state.txns, accountId, atMs);
    const actual = balanceAt(state.txns, accountId, atMs);
    assert.equal(actual, expected, `balanceAt mismatch for ${accountId} at ${atMs}`);
  }
}

function assertSignFlipViolations(state: LedgerState, seed: number): void {
  if (state.txns.length === 0) return;
  const rng = new SeededRng(seed ^ 0x85ebca6b);
  for (let i = 0; i < Math.min(10, state.txns.length); i += 1) {
    const txn = rng.pick(state.txns);
    if (txn.postings.length === 0) continue;
    const flippedPostings = txn.postings.map((posting) => ({
      ...posting,
      amount: asNonZeroAmount(posting.amount * -1),
    }));
    const mutated = { ...txn, postings: flippedPostings };
    const violations = validateTransactionLike(state, mutated);
    assert.equal(
      violations.length > 0,
      true,
      `expected sign flip violations for seed=${seed}`
    );
  }
}

const seeds = resolveSeeds();
const eventCount = parseIntEnv('CHERRY_ACCOUNTING_EVENT_COUNT', DEFAULT_EVENT_COUNT);

for (const seed of seeds) {
  const run = generateEventStream(seed, eventCount);
  const rerun = generateEventStream(seed, eventCount);
  assert.deepEqual(
    snapshotLedger(run.finalState),
    snapshotLedger(rerun.finalState),
    `determinism mismatch for seed=${seed}`
  );

  let state = createLedgerState(run.accounts, run.currency);
  for (const event of run.events) {
    const prevTxns = state.txns;
    const next = applyLedgerEvent(state, event);
    const violations = validateLedgerState(next);
    assert.equal(
      violations.length,
      0,
      `ledger violations for seed=${seed}: ${JSON.stringify(violations)}`
    );
    const recomputed = computeBalances(next.accounts, next.txns);
    assert.deepEqual(
      serializeBalances(next),
      serializeBalances({ ...next, balances: recomputed }),
      `balance mismatch for seed=${seed}`
    );
    assert.equal(
      next.txns.length >= prevTxns.length,
      true,
      `txn history shrank for seed=${seed}`
    );
    for (let i = 0; i < prevTxns.length; i += 1) {
      assert.equal(next.txns[i], prevTxns[i], `txn history mutated for seed=${seed}`);
    }
    state = next;
  }

  assert.deepEqual(
    snapshotLedger(state),
    snapshotLedger(run.finalState),
    `materialized mismatch for seed=${seed}`
  );

  const replayed = replayLedgerEvents(run.accounts, run.currency, run.events);
  assert.deepEqual(
    snapshotLedger(replayed),
    snapshotLedger(state),
    `replay mismatch for seed=${seed}`
  );

  assert.deepEqual(
    serializeExternalIndex(replayed),
    serializeExternalIndex(state),
    `external index mismatch for seed=${seed}`
  );

  for (const [externalId, txnId] of state.externalIndex.entries()) {
    const txn = getTxnByExternalId(state, externalId);
    assert.equal(txn.id, txnId, `external lookup mismatch for seed=${seed}`);
  }

  let idempotent = state;
  for (const event of run.events) {
    idempotent = applyLedgerEvent(idempotent, event);
  }
  assert.deepEqual(
    snapshotLedger(idempotent),
    snapshotLedger(state),
    `idempotency mismatch for seed=${seed}`
  );

  assertTimeBalances(state, seed);
  assertSignFlipViolations(state, seed);
}

console.warn('accounting property: ok');
