import assert from 'node:assert/strict';
import { buildEngineContext } from '../lib/engine/context';
import {
  buildAccountingSnapshot,
  filterAccountingSafeDecisions,
  proveHypotheticalDecision,
  type EngineDecisionWithAccounting,
} from '../lib/accounting/engine-proof';
import {
  asNonZeroAmount,
  asTxnId,
  balancePostings,
  createTransaction,
  type Transaction,
} from '../lib/accounting/ledger';

function buildState(overrides: Partial<Parameters<typeof buildAccountingSnapshot>[0]> = {}) {
  return {
    userId: 'user-proof',
    cards: [],
    buckets: [],
    debts: [],
    constraints: { hard: {}, soft: {} },
    world: {},
    cash: { liquidCents: 0, nextPaycheckDateMs: null, nextPaycheckNetCents: null },
    preferences: { profileId: 'BALANCED' },
    ...overrides,
  };
}

function buildContext(overrides: Partial<Parameters<typeof buildEngineContext>[0]> = {}) {
  return buildEngineContext({
    surface: 'web',
    nowMs: new Date('2024-01-01T00:00:00Z').getTime(),
    merchantCategoryKey: 'DINING',
    amountCents: 5000,
    ...overrides,
  });
}

function buildSpendTxn(
  snapshot: ReturnType<typeof buildAccountingSnapshot>,
  amount: number,
  nowMs: number
): Transaction {
  return createTransaction(
    {
      id: asTxnId(
        snapshot.ledger.txns.length === 0
          ? 'txn-spend'
          : `txn-spend-${snapshot.ledger.txns.length}`
      ),
      type: 'SPEND',
      postings: balancePostings([
        {
          accountId: snapshot.accounts.expense,
          amount: asNonZeroAmount(amount),
          currency: snapshot.ledger.currency,
          role: 'SINK',
        },
        {
          accountId: snapshot.accounts.cash,
          amount: asNonZeroAmount(-amount),
          currency: snapshot.ledger.currency,
          role: 'SOURCE',
        },
      ]),
      effectiveAtMs: nowMs,
      externalId: null,
    },
    snapshot.ledger
  );
}

async function testOverdraftRequiresLiability(): Promise<void> {
  const state = buildState({ cash: { liquidCents: 0, nextPaycheckDateMs: null, nextPaycheckNetCents: null } });
  const ctx = buildContext({ amountCents: 5000 });
  const snapshot = buildAccountingSnapshot(state, ctx.nowMs);
  const spend = buildSpendTxn(snapshot, 5000, ctx.nowMs);
  const proof = proveHypotheticalDecision(snapshot.ledger, [spend]);
  assert.ok(
    proof.proof.some((entry) => entry.invariant === 'I4'),
    'expected overdraft violation when spending from cash without liability'
  );
}

async function testUnbalancedSuggestionRejected(): Promise<void> {
  const state = buildState({ cash: { liquidCents: 10_000, nextPaycheckDateMs: null, nextPaycheckNetCents: null } });
  const ctx = buildContext({ amountCents: 1000 });
  const snapshot = buildAccountingSnapshot(state, ctx.nowMs);
  const spend = buildSpendTxn(snapshot, 1000, ctx.nowMs);
  const mutated = {
    ...spend,
    postings: spend.postings.map((posting, index) =>
      index === 0
        ? { ...posting, amount: asNonZeroAmount(posting.amount + 1) }
        : posting
    ),
  };
  const proof = proveHypotheticalDecision(snapshot.ledger, [mutated as Transaction]);
  assert.ok(
    proof.proof.some((entry) => entry.invariant === 'I1'),
    'expected unbalanced transaction to fail proof'
  );
}

async function testSignAbuseRejected(): Promise<void> {
  const state = buildState({ cash: { liquidCents: 10_000, nextPaycheckDateMs: null, nextPaycheckNetCents: null } });
  const ctx = buildContext({ amountCents: 1200 });
  const snapshot = buildAccountingSnapshot(state, ctx.nowMs);
  const spend = buildSpendTxn(snapshot, 1200, ctx.nowMs);
  const mutated = {
    ...spend,
    postings: spend.postings.map((posting, index) =>
      index === 0 ? { ...posting, role: 'OFFSET' } : posting
    ),
  };
  const proof = proveHypotheticalDecision(snapshot.ledger, [mutated as Transaction]);
  assert.ok(
    proof.proof.some((entry) => entry.invariant === 'I5'),
    'expected sign/role abuse to fail proof'
  );
}

async function testFiltersUnsafeDecisions(): Promise<void> {
  const safeDecision: EngineDecisionWithAccounting = {
    actionId: 'safe',
    action: { type: 'REJECT_PURCHASE' },
    score: 1,
    reasons: [],
    projections: { buckets: [], debt: [], cash: { projectedLiquidCents: null, projectedOverdraftRisk: null } },
    constraintsBreached: [],
    accounting: { proposedTxns: [], proof: [] },
  };
  const unsafeDecision: EngineDecisionWithAccounting = {
    ...safeDecision,
    actionId: 'unsafe',
    accounting: { proposedTxns: [], proof: [{ invariant: 'I1', message: 'bad' }] },
  };
  const filtered = filterAccountingSafeDecisions([safeDecision, unsafeDecision]);
  assert.deepEqual(filtered.map((decision) => decision.actionId), ['safe']);
}

await testOverdraftRequiresLiability();
await testUnbalancedSuggestionRejected();
await testSignAbuseRejected();
await testFiltersUnsafeDecisions();

console.log('engine accounting proof: ok');
