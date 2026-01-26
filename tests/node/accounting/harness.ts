import {
  asAccountId,
  asCurrency,
  asNonZeroAmount,
  asTxnId,
  applyLedgerEvent,
  balancePostings,
  createLedgerState,
  createTransaction,
  reverseTransaction,
  type Account,
  type AccountId,
  type Currency,
  type LedgerEvent,
  type LedgerState,
  type PostingRole,
  type Transaction,
} from '../../../lib/accounting/ledger.js';

export class SeededRng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  nextU32(): number {
    this.state = (1664525 * this.state + 1013904223) >>> 0;
    return this.state;
  }

  next(): number {
    return this.nextU32() / 0x100000000;
  }

  int(min: number, max: number): number {
    if (max < min) return min;
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  bool(probability: number = 0.5): boolean {
    return this.next() < probability;
  }

  pick<T>(items: readonly T[]): T {
    const idx = this.int(0, Math.max(0, items.length - 1));
    return items[idx] as T;
  }
}

type AccountIds = {
  cash: AccountId;
  reserved: AccountId;
  credit: AccountId;
  income: AccountId;
  equity: AccountId;
  expenses: readonly [AccountId, AccountId];
};

const DEFAULT_CURRENCY = asCurrency('USD');
const IDS: AccountIds = {
  cash: asAccountId('ASSET:CASH'),
  reserved: asAccountId('ASSET:RESERVED'),
  credit: asAccountId('LIABILITY:CREDIT_CARD'),
  income: asAccountId('INCOME:PRIMARY'),
  equity: asAccountId('EQUITY:OPENING'),
  expenses: [asAccountId('EXPENSE:DINING'), asAccountId('EXPENSE:GROCERIES')] as const,
};

const DEFAULT_ACCOUNTS: Account[] = [
  { id: IDS.cash, type: 'ASSET', currency: DEFAULT_CURRENCY, noOverdraft: true },
  { id: IDS.reserved, type: 'ASSET', currency: DEFAULT_CURRENCY, noOverdraft: true },
  { id: IDS.credit, type: 'LIABILITY', currency: DEFAULT_CURRENCY, noOverdraft: false },
  { id: IDS.income, type: 'INCOME', currency: DEFAULT_CURRENCY, noOverdraft: false },
  { id: IDS.equity, type: 'EQUITY', currency: DEFAULT_CURRENCY, noOverdraft: false },
  { id: IDS.expenses[0], type: 'EXPENSE', currency: DEFAULT_CURRENCY, noOverdraft: false },
  { id: IDS.expenses[1], type: 'EXPENSE', currency: DEFAULT_CURRENCY, noOverdraft: false },
];

export type GeneratedStream = {
  accounts: Account[];
  currency: Currency;
  events: LedgerEvent[];
  finalState: LedgerState;
};

export function buildDefaultAccounts(): { accounts: Account[]; currency: Currency; ids: AccountIds } {
  return {
    accounts: [...DEFAULT_ACCOUNTS],
    currency: DEFAULT_CURRENCY,
    ids: IDS,
  };
}

export function generateEventStream(seed: number, length: number): GeneratedStream {
  const rng = new SeededRng(seed);
  const { accounts, currency, ids } = buildDefaultAccounts();
  let state = createLedgerState(accounts, currency);
  const events: LedgerEvent[] = [];
  let txnCounter = 0;
  let externalCounter = 0;
  let nowMs = 1_700_000_000_000 + seed;

  const nextTxnId = (label: string): ReturnType<typeof asTxnId> =>
    asTxnId(`${label}-${seed}-${txnCounter++}`);
  const nextExternalId = (label: string): string => {
    const id = `${label}-${seed}-${externalCounter++}`;
    return id;
  };

  const pushEvent = (event: LedgerEvent): void => {
    state = applyLedgerEvent(state, event);
    events.push(event);
  };

  const openingAmount = rng.int(50_000, 200_000);
  const openingTxn = createTransaction(
    {
      id: nextTxnId('opening'),
      type: 'OPENING',
      postings: balancePostings([
        {
          accountId: ids.cash,
          amount: asNonZeroAmount(openingAmount),
          currency,
          role: 'SINK',
        },
        {
          accountId: ids.equity,
          amount: asNonZeroAmount(-openingAmount),
          currency,
          role: 'EQUITY_OFFSET',
        },
      ]),
      effectiveAtMs: nowMs,
      externalId: nextExternalId('opening'),
    },
    state
  );
  pushEvent({ type: 'TXN', txn: openingTxn });

  for (let i = 0; i < length; i += 1) {
    nowMs += rng.int(1, 10_000);
    const roll = rng.int(0, 99);

    if (roll < 6) {
      pushEvent({ type: 'RECOMPUTE' });
      continue;
    }
    if (roll < 12) {
      if (events.length > 0) {
        pushEvent(rng.pick(events));
      }
      continue;
    }

    const eventType =
      roll < 50
        ? 'SPEND'
        : roll < 65
          ? 'INCOME'
          : roll < 75
            ? 'TRANSFER'
            : roll < 85
              ? 'REFUND'
              : roll < 92
                ? 'ADJUSTMENT'
                : 'REVERSAL';

    const externalId = nextExternalId(eventType.toLowerCase());
    let txn: Transaction | null = null;

    if (eventType === 'SPEND') {
      txn = buildSpendTxn(state, ids, rng, nowMs, nextTxnId('spend'), externalId);
    } else if (eventType === 'INCOME') {
      txn = buildIncomeTxn(state, ids, rng, nowMs, nextTxnId('income'), externalId);
    } else if (eventType === 'TRANSFER') {
      txn = buildTransferTxn(state, ids, rng, nowMs, nextTxnId('transfer'), externalId);
      if (txn === null) {
        txn = buildIncomeTxn(state, ids, rng, nowMs, nextTxnId('income'), externalId);
      }
    } else if (eventType === 'REFUND') {
      txn = buildRefundTxn(state, ids, rng, nowMs, nextTxnId('refund'), externalId);
    } else if (eventType === 'ADJUSTMENT') {
      txn = buildAdjustmentTxn(state, ids, rng, nowMs, nextTxnId('adjust'), externalId);
    } else {
      txn = buildReversalTxn(state, rng, nowMs, nextTxnId('reversal'), externalId);
      if (txn === null) {
        txn = buildSpendTxn(state, ids, rng, nowMs, nextTxnId('spend'), externalId);
      }
    }

    pushEvent({ type: 'TXN', txn });
  }

  return {
    accounts,
    currency,
    events,
    finalState: state,
  };
}

export function snapshotLedger(state: LedgerState): {
  currency: string;
  txns: Array<{
    id: string;
    type: string;
    effectiveAtMs: number;
    externalId: string | null;
    postings: Array<{ accountId: string; amount: number; currency: string; role: PostingRole }>;
  }>;
  balances: Array<{ accountId: string; balance: number }>;
  externalIndex: Array<{ externalId: string; txnId: string }>;
} {
  const balances = [...state.balances.entries()]
    .sort(([a], [b]) => compareStrings(a, b))
    .map(([accountId, balance]) => ({ accountId, balance }));
  const externalIndex = [...state.externalIndex.entries()]
    .sort(([a], [b]) => compareStrings(a, b))
    .map(([externalId, txnId]) => ({ externalId, txnId }));
  const txns = state.txns.map((txn) => ({
    id: txn.id,
    type: txn.type,
    effectiveAtMs: txn.effectiveAtMs,
    externalId: txn.externalId,
    postings: txn.postings.map((posting) => ({
      accountId: posting.accountId,
      amount: posting.amount,
      currency: posting.currency,
      role: posting.role,
    })),
  }));
  return {
    currency: state.currency,
    txns,
    balances,
    externalIndex,
  };
}

function buildSpendTxn(
  state: LedgerState,
  ids: AccountIds,
  rng: SeededRng,
  nowMs: number,
  txnId: ReturnType<typeof asTxnId>,
  externalId: string
): Transaction {
  const amount = rng.int(100, 5_000);
  const cashBalance = state.balances.get(ids.cash) ?? 0;
  const funding = cashBalance >= amount ? ids.cash : ids.credit;
  const expense = rng.pick(ids.expenses);
  return createTransaction(
    {
      id: txnId,
      type: 'SPEND',
      postings: balancePostings([
        {
          accountId: expense,
          amount: asNonZeroAmount(amount),
          currency: state.currency,
          role: 'SINK',
        },
        {
          accountId: funding,
          amount: asNonZeroAmount(-amount),
          currency: state.currency,
          role: funding === ids.credit ? 'LIABILITY_DRAW' : 'SOURCE',
        },
      ]),
      effectiveAtMs: nowMs,
      externalId,
    },
    state
  );
}

function buildIncomeTxn(
  state: LedgerState,
  ids: AccountIds,
  rng: SeededRng,
  nowMs: number,
  txnId: ReturnType<typeof asTxnId>,
  externalId: string
): Transaction {
  const amount = rng.int(500, 12_000);
  return createTransaction(
    {
      id: txnId,
      type: 'INCOME',
      postings: balancePostings([
        {
          accountId: ids.cash,
          amount: asNonZeroAmount(amount),
          currency: state.currency,
          role: 'SINK',
        },
        {
          accountId: ids.income,
          amount: asNonZeroAmount(-amount),
          currency: state.currency,
          role: 'OFFSET',
        },
      ]),
      effectiveAtMs: nowMs,
      externalId,
    },
    state
  );
}

function buildTransferTxn(
  state: LedgerState,
  ids: AccountIds,
  rng: SeededRng,
  nowMs: number,
  txnId: ReturnType<typeof asTxnId>,
  externalId: string
): Transaction | null {
  const cashBalance = state.balances.get(ids.cash) ?? 0;
  const reservedBalance = state.balances.get(ids.reserved) ?? 0;
  const minAmount = 200;
  const preferCash = rng.bool(0.6);

  if (preferCash && cashBalance >= minAmount) {
    const amount = rng.int(minAmount, Math.min(6_000, cashBalance));
    return createTransaction(
      {
        id: txnId,
        type: 'TRANSFER',
        postings: balancePostings([
          {
            accountId: ids.reserved,
            amount: asNonZeroAmount(amount),
            currency: state.currency,
            role: 'SINK',
          },
          {
            accountId: ids.cash,
            amount: asNonZeroAmount(-amount),
            currency: state.currency,
            role: 'SOURCE',
          },
        ]),
        effectiveAtMs: nowMs,
        externalId,
      },
      state
    );
  }

  if (reservedBalance >= minAmount) {
    const amount = rng.int(minAmount, Math.min(4_000, reservedBalance));
    return createTransaction(
      {
        id: txnId,
        type: 'TRANSFER',
        postings: balancePostings([
          {
            accountId: ids.cash,
            amount: asNonZeroAmount(amount),
            currency: state.currency,
            role: 'SINK',
          },
          {
            accountId: ids.reserved,
            amount: asNonZeroAmount(-amount),
            currency: state.currency,
            role: 'SOURCE',
          },
        ]),
        effectiveAtMs: nowMs,
        externalId,
      },
      state
    );
  }

  if (cashBalance >= minAmount) {
    const amount = rng.int(minAmount, Math.min(3_000, cashBalance));
    return createTransaction(
      {
        id: txnId,
        type: 'TRANSFER',
        postings: balancePostings([
          {
            accountId: ids.reserved,
            amount: asNonZeroAmount(amount),
            currency: state.currency,
            role: 'SINK',
          },
          {
            accountId: ids.cash,
            amount: asNonZeroAmount(-amount),
            currency: state.currency,
            role: 'SOURCE',
          },
        ]),
        effectiveAtMs: nowMs,
        externalId,
      },
      state
    );
  }

  return null;
}

function buildRefundTxn(
  state: LedgerState,
  ids: AccountIds,
  rng: SeededRng,
  nowMs: number,
  txnId: ReturnType<typeof asTxnId>,
  externalId: string
): Transaction {
  const amount = rng.int(100, 4_000);
  const expense = rng.pick(ids.expenses);
  return createTransaction(
    {
      id: txnId,
      type: 'REFUND',
      postings: balancePostings([
        {
          accountId: ids.cash,
          amount: asNonZeroAmount(amount),
          currency: state.currency,
          role: 'SINK',
        },
        {
          accountId: expense,
          amount: asNonZeroAmount(-amount),
          currency: state.currency,
          role: 'OFFSET',
        },
      ]),
      effectiveAtMs: nowMs,
      externalId,
    },
    state
  );
}

function buildAdjustmentTxn(
  state: LedgerState,
  ids: AccountIds,
  rng: SeededRng,
  nowMs: number,
  txnId: ReturnType<typeof asTxnId>,
  externalId: string
): Transaction {
  const cashBalance = state.balances.get(ids.cash) ?? 0;
  const amount = rng.int(100, 3_000);
  const usePositive = cashBalance < amount || rng.bool(0.7);
  const cashAmount = usePositive ? amount : -amount;
  return createTransaction(
    {
      id: txnId,
      type: 'ADJUSTMENT',
      postings: balancePostings([
        {
          accountId: ids.cash,
          amount: asNonZeroAmount(cashAmount),
          currency: state.currency,
          role: cashAmount > 0 ? 'SINK' : 'SOURCE',
        },
        {
          accountId: ids.equity,
          amount: asNonZeroAmount(-cashAmount),
          currency: state.currency,
          role: 'EQUITY_OFFSET',
        },
      ]),
      effectiveAtMs: nowMs,
      externalId,
    },
    state
  );
}

function buildReversalTxn(
  state: LedgerState,
  rng: SeededRng,
  nowMs: number,
  txnId: ReturnType<typeof asTxnId>,
  externalId: string
): Transaction | null {
  const candidates = state.txns.filter((txn) => txn.type === 'SPEND');
  if (candidates.length === 0) return null;
  const original = rng.pick(candidates);
  return reverseTransaction(original, txnId, nowMs, externalId);
}

function compareStrings(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}
