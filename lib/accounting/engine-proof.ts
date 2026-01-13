import type { EngineAction, EngineContext, EngineDecision, EngineState } from '../engine/types';
import {
  applyLedgerEvent,
  asAccountId,
  asCurrency,
  asNonZeroAmount,
  asTxnId,
  balancePostings,
  createLedgerState,
  createTransaction,
  type Account,
  type AccountId,
  type LedgerState,
  type LedgerViolation,
  type Transaction,
  validateLedgerState,
} from './ledger';

export type HypotheticalDecision = {
  proposedTxns: Transaction[];
  proof: LedgerViolation[];
};

export type EngineDecisionWithAccounting = EngineDecision & {
  accounting: HypotheticalDecision;
};

type AccountingAccounts = {
  cash: AccountId;
  liability: AccountId;
  expense: AccountId;
  income: AccountId;
  equity: AccountId;
};

type AccountingSnapshot = {
  ledger: LedgerState;
  accounts: AccountingAccounts;
};

const ACCOUNT_IDS: AccountingAccounts = {
  cash: asAccountId('ASSET:CASH'),
  liability: asAccountId('LIABILITY:CREDIT_CARD'),
  expense: asAccountId('EXPENSE:OTHER'),
  income: asAccountId('INCOME:PRIMARY'),
  equity: asAccountId('EQUITY:OPENING'),
};

const ACCOUNT_DEFS: Account[] = [
  { id: ACCOUNT_IDS.cash, type: 'ASSET', currency: asCurrency('USD'), noOverdraft: true },
  { id: ACCOUNT_IDS.liability, type: 'LIABILITY', currency: asCurrency('USD'), noOverdraft: false },
  { id: ACCOUNT_IDS.expense, type: 'EXPENSE', currency: asCurrency('USD'), noOverdraft: false },
  { id: ACCOUNT_IDS.income, type: 'INCOME', currency: asCurrency('USD'), noOverdraft: false },
  { id: ACCOUNT_IDS.equity, type: 'EQUITY', currency: asCurrency('USD'), noOverdraft: false },
];

export function buildAccountingSnapshot(state: EngineState, nowMs: number): AccountingSnapshot {
  const ledger = createLedgerState(ACCOUNT_DEFS, asCurrency('USD'));
  let snapshot = ledger;

  const cashBalance = resolveNonNegative(state.cash?.liquidCents);
  if (cashBalance > 0) {
    const txn = createTransaction(
      {
        id: asTxnId(`opening-cash-${state.userId}`),
        type: 'ADJUSTMENT',
        postings: balancePostings([
          {
            accountId: ACCOUNT_IDS.cash,
            amount: asNonZeroAmount(cashBalance),
            currency: snapshot.currency,
            role: 'SINK',
          },
          {
            accountId: ACCOUNT_IDS.equity,
            amount: asNonZeroAmount(-cashBalance),
            currency: snapshot.currency,
            role: 'EQUITY_OFFSET',
          },
        ]),
        effectiveAtMs: nowMs,
        externalId: `opening-cash-${state.userId}`,
      },
      snapshot
    );
    snapshot = applyLedgerEvent(snapshot, { type: 'TXN', txn });
  }

  const debtBalance = resolveNonNegative(sumDebtBalances(state.debts));
  if (debtBalance > 0) {
    const txn = createTransaction(
      {
        id: asTxnId(`opening-liability-${state.userId}`),
        type: 'ADJUSTMENT',
        postings: balancePostings([
          {
            accountId: ACCOUNT_IDS.liability,
            amount: asNonZeroAmount(-debtBalance),
            currency: snapshot.currency,
            role: 'LIABILITY_DRAW',
          },
          {
            accountId: ACCOUNT_IDS.equity,
            amount: asNonZeroAmount(debtBalance),
            currency: snapshot.currency,
            role: 'OFFSET',
          },
        ]),
        effectiveAtMs: nowMs,
        externalId: `opening-liability-${state.userId}`,
      },
      snapshot
    );
    snapshot = applyLedgerEvent(snapshot, { type: 'TXN', txn });
  }

  return { ledger: snapshot, accounts: ACCOUNT_IDS };
}

export function attachAccountingProof(params: {
  decisions: EngineDecision[];
  ctx: EngineContext;
  snapshot: AccountingSnapshot;
}): EngineDecisionWithAccounting[] {
  const { decisions, ctx, snapshot } = params;
  const proved: EngineDecisionWithAccounting[] = [];

  for (const decision of decisions) {
    const proposedTxns = buildHypotheticalTxns(decision.action, ctx, snapshot);
    const accounting = proveHypotheticalDecision(snapshot.ledger, proposedTxns);
    proved.push({ ...decision, accounting });
  }

  return proved;
}

export function proveHypotheticalDecision(
  ledger: LedgerState,
  proposedTxns: Transaction[]
): HypotheticalDecision {
  let state = ledger;
  try {
    for (const txn of proposedTxns) {
      state = applyLedgerEvent(state, { type: 'TXN', txn });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      proposedTxns,
      proof: [{ invariant: 'I5', message }],
    };
  }
  return {
    proposedTxns,
    proof: validateLedgerState(state),
  };
}

export function filterAccountingSafeDecisions(
  decisions: EngineDecisionWithAccounting[]
): EngineDecisionWithAccounting[] {
  return decisions.filter((decision) => decision.accounting.proof.length === 0);
}

function buildHypotheticalTxns(
  action: EngineAction,
  ctx: EngineContext,
  snapshot: AccountingSnapshot
): Transaction[] {
  const amount = resolveNonNegative(ctx.amountCents);
  if (amount <= 0) return [];

  const txns: Transaction[] = [];
  const nowMs = ctx.nowMs;

  if (action.type === 'USE_CARD' || action.type === 'USE_CARD_WITH_PAYDOWN') {
    txns.push(buildSpendTxn(snapshot, amount, nowMs, action));
  }

  if (action.type === 'PAY_DOWN_DEBT' || action.type === 'USE_CARD_WITH_PAYDOWN') {
    const paydown = resolveNonNegative(action.paydownAmountCents);
    if (paydown > 0) {
      txns.push(buildPaydownTxn(snapshot, paydown, nowMs, action));
    }
  }

  return txns;
}

function buildSpendTxn(
  snapshot: AccountingSnapshot,
  amount: number,
  nowMs: number,
  action: EngineAction
): Transaction {
  const cashBalance = snapshot.ledger.balances.get(snapshot.accounts.cash) ?? 0;
  const fundingAccount =
    cashBalance >= amount ? snapshot.accounts.cash : snapshot.accounts.liability;
  const fundingRole = fundingAccount === snapshot.accounts.cash ? 'SOURCE' : 'LIABILITY_DRAW';

  return createTransaction(
    {
      id: asTxnId(`hypo-spend-${action.type}`),
      type: 'SPEND',
      postings: balancePostings([
        {
          accountId: snapshot.accounts.expense,
          amount: asNonZeroAmount(amount),
          currency: snapshot.ledger.currency,
          role: 'SINK',
        },
        {
          accountId: fundingAccount,
          amount: asNonZeroAmount(-amount),
          currency: snapshot.ledger.currency,
          role: fundingRole,
        },
      ]),
      effectiveAtMs: nowMs,
      externalId: null,
    },
    snapshot.ledger
  );
}

function buildPaydownTxn(
  snapshot: AccountingSnapshot,
  amount: number,
  nowMs: number,
  action: EngineAction
): Transaction {
  return createTransaction(
    {
      id: asTxnId(`hypo-paydown-${action.type}`),
      type: 'TRANSFER',
      postings: balancePostings([
        {
          accountId: snapshot.accounts.cash,
          amount: asNonZeroAmount(-amount),
          currency: snapshot.ledger.currency,
          role: 'SOURCE',
        },
        {
          accountId: snapshot.accounts.liability,
          amount: asNonZeroAmount(amount),
          currency: snapshot.ledger.currency,
          role: 'LIABILITY_REPAY',
        },
      ]),
      effectiveAtMs: nowMs,
      externalId: null,
    },
    snapshot.ledger
  );
}

function sumDebtBalances(debts: EngineState['debts']): number {
  if (!Array.isArray(debts)) return 0;
  let total = 0;
  for (const debt of debts) {
    if (typeof debt.balanceCents !== 'number') continue;
    if (!Number.isFinite(debt.balanceCents)) continue;
    total += Math.max(0, Math.floor(debt.balanceCents));
  }
  return total;
}

function resolveNonNegative(value: number | null | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}
