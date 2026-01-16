/**
 * PROVES:
 * - A8: Monotonic ordering / time correctness
 *
 * NEW TEST (A8 GAP CLOSURE)
 *
 * ASSUMPTIONS:
 * - Engine outputs use ctx.nowMs as effective time.
 * - Gap closure: engine-output txns applied to ledger preserve time-ordered balances.
 *
 * STATE SPACE:
 * - Varies: decision amounts and effective times
 * - Fixed: account set, currency
 */
import * as assert from 'node:assert/strict';
import { buildEngineContext } from '../lib/engine/context';
import type { EngineActionType, EngineDecision, EngineState } from '../lib/engine/types';
import {
  attachAccountingProof,
  buildAccountingSnapshot,
  type EngineDecisionWithAccounting,
} from '../lib/accounting/engine-proof';
import { applyLedgerEvent, balanceAt, type AccountId, type Transaction } from '../lib/accounting/ledger';

function buildState(
  overrides: Partial<Parameters<typeof buildAccountingSnapshot>[0]> = {}
): EngineState {
  const base: EngineState = {
    userId: 'user-time-order',
    cards: [],
    buckets: [],
    debts: [],
    constraints: { hard: {}, soft: {} },
    world: {},
    cash: { liquidCents: 20_000, nextPaycheckDateMs: null, nextPaycheckNetCents: null },
    preferences: { profileId: 'BALANCED' },
  };
  return { ...base, ...overrides };
}

function buildDecision(actionType: EngineActionType): EngineDecision {
  return {
    actionId: `decision-${actionType}`,
    action: { type: actionType },
    score: 1,
    reasons: [],
    projections: { buckets: [], debt: [], cash: { projectedLiquidCents: null, projectedOverdraftRisk: null } },
    constraintsBreached: [],
  };
}

function collectTxns(decisions: EngineDecisionWithAccounting[]): Transaction[] {
  const collected: Transaction[] = [];
  for (const decision of decisions) {
    collected.push(...decision.accounting.proposedTxns);
  }
  return collected;
}

function sumPostingsForAccount(txns: Transaction[], accountId: AccountId): number {
  let total = 0;
  for (const txn of txns) {
    for (const posting of txn.postings) {
      if (posting.accountId === accountId) {
        total += posting.amount;
      }
    }
  }
  return total;
}

const nowMs1 = 1_700_000_000_000;
const nowMs2 = nowMs1 + 60_000;

assert.ok(nowMs2 > nowMs1, 'expected nondecreasing effective times');

const state = buildState();
const snapshot = buildAccountingSnapshot(state, nowMs1);

const ctx1 = buildEngineContext({
  surface: 'web',
  nowMs: nowMs1,
  merchantCategoryKey: 'DINING',
  amountCents: 1200,
});
const ctx2 = buildEngineContext({
  surface: 'web',
  nowMs: nowMs2,
  merchantCategoryKey: 'DINING',
  amountCents: 700,
});

const decision = buildDecision('USE_CARD');

const firstProof = attachAccountingProof({ decisions: [decision], ctx: ctx1, snapshot });
const secondProof = attachAccountingProof({ decisions: [decision], ctx: ctx2, snapshot });

const firstTxns = collectTxns(firstProof);
const secondTxns = collectTxns(secondProof);

assert.ok(firstTxns.length > 0, 'expected first hypothetical txns');
assert.ok(secondTxns.length > 0, 'expected second hypothetical txns');

for (const txn of firstTxns) {
  assert.equal(txn.effectiveAtMs, nowMs1, 'expected first txns to use ctx1 time');
}
for (const txn of secondTxns) {
  assert.equal(txn.effectiveAtMs, nowMs2, 'expected second txns to use ctx2 time');
}

let ledger = snapshot.ledger;
for (const txn of firstTxns) {
  ledger = applyLedgerEvent(ledger, { type: 'TXN', txn });
}
for (const txn of secondTxns) {
  ledger = applyLedgerEvent(ledger, { type: 'TXN', txn });
}

const cashAccount = snapshot.accounts.cash;
const baseBalance = snapshot.ledger.balances.get(cashAccount) ?? 0;
const expectedAtFirst = baseBalance + sumPostingsForAccount(firstTxns, cashAccount);
const expectedAtSecond =
  baseBalance + sumPostingsForAccount([...firstTxns, ...secondTxns], cashAccount);

assert.equal(
  balanceAt(ledger.txns, cashAccount, nowMs1),
  expectedAtFirst,
  'as-of balance at first time mismatch'
);
assert.equal(
  balanceAt(ledger.txns, cashAccount, nowMs2),
  expectedAtSecond,
  'as-of balance at second time mismatch'
);

console.warn('engine accounting time order: ok');
