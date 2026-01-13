export type Currency = string & { __currencyBrand: true };
export type AccountId = string & { __accountIdBrand: true };
export type TxnId = string & { __txnIdBrand: true };
export type NonZeroAmount = number & { __nonZeroAmountBrand: true };

export type AccountType = 'ASSET' | 'EXPENSE' | 'INCOME' | 'LIABILITY' | 'EQUITY';
export type PostingRole =
  | 'SOURCE'
  | 'SINK'
  | 'OFFSET'
  | 'LIABILITY_DRAW'
  | 'LIABILITY_REPAY'
  | 'EQUITY_OFFSET';
export type TxnType =
  | 'OPENING'
  | 'SPEND'
  | 'INCOME'
  | 'TRANSFER'
  | 'REFUND'
  | 'ADJUSTMENT'
  | 'REVERSAL';

export type Account = {
  id: AccountId;
  type: AccountType;
  currency: Currency;
  noOverdraft: boolean;
};

export type Posting = {
  accountId: AccountId;
  amount: NonZeroAmount;
  currency: Currency;
  role: PostingRole;
};

export type BalancedPostings = ReadonlyArray<Posting> & { __balancedPostingsBrand: true };

export type Transaction = {
  id: TxnId;
  type: TxnType;
  postings: BalancedPostings;
  effectiveAtMs: number;
  externalId: string | null;
};

export type LedgerState = {
  currency: Currency;
  accounts: Map<AccountId, Account>;
  txns: Transaction[];
  externalIndex: Map<string, TxnId>;
  balances: Map<AccountId, number>;
};

export type LedgerEvent = { type: 'TXN'; txn: Transaction } | { type: 'RECOMPUTE' };

export type LedgerViolation = {
  invariant: 'I1' | 'I4' | 'I5' | 'I7' | 'I9';
  message: string;
};

type PostingRule = { accountType: AccountType; sign: 1 | -1 };
type PostingRuleMatrix = Record<TxnType, Record<PostingRole, PostingRule[]>>;

const POSTING_RULES: PostingRuleMatrix = {
  OPENING: {
    SOURCE: [],
    SINK: [{ accountType: 'ASSET', sign: 1 }],
    OFFSET: [],
    LIABILITY_DRAW: [],
    LIABILITY_REPAY: [],
    EQUITY_OFFSET: [{ accountType: 'EQUITY', sign: -1 }],
  },
  SPEND: {
    SOURCE: [{ accountType: 'ASSET', sign: -1 }],
    SINK: [{ accountType: 'EXPENSE', sign: 1 }],
    OFFSET: [],
    LIABILITY_DRAW: [{ accountType: 'LIABILITY', sign: -1 }],
    LIABILITY_REPAY: [],
    EQUITY_OFFSET: [],
  },
  INCOME: {
    SOURCE: [],
    SINK: [{ accountType: 'ASSET', sign: 1 }],
    OFFSET: [{ accountType: 'INCOME', sign: -1 }],
    LIABILITY_DRAW: [],
    LIABILITY_REPAY: [],
    EQUITY_OFFSET: [],
  },
  TRANSFER: {
    SOURCE: [{ accountType: 'ASSET', sign: -1 }],
    SINK: [{ accountType: 'ASSET', sign: 1 }],
    OFFSET: [],
    LIABILITY_DRAW: [],
    LIABILITY_REPAY: [{ accountType: 'LIABILITY', sign: 1 }],
    EQUITY_OFFSET: [],
  },
  REFUND: {
    SOURCE: [],
    SINK: [{ accountType: 'ASSET', sign: 1 }],
    OFFSET: [{ accountType: 'EXPENSE', sign: -1 }],
    LIABILITY_DRAW: [],
    LIABILITY_REPAY: [],
    EQUITY_OFFSET: [],
  },
  ADJUSTMENT: {
    SOURCE: [{ accountType: 'ASSET', sign: -1 }],
    SINK: [{ accountType: 'ASSET', sign: 1 }],
    OFFSET: [{ accountType: 'EQUITY', sign: 1 }],
    LIABILITY_DRAW: [{ accountType: 'LIABILITY', sign: -1 }],
    LIABILITY_REPAY: [{ accountType: 'LIABILITY', sign: 1 }],
    EQUITY_OFFSET: [{ accountType: 'EQUITY', sign: -1 }],
  },
  REVERSAL: {
    SOURCE: [{ accountType: 'ASSET', sign: 1 }],
    SINK: [
      { accountType: 'ASSET', sign: -1 },
      { accountType: 'EXPENSE', sign: -1 },
    ],
    OFFSET: [
      { accountType: 'INCOME', sign: 1 },
      { accountType: 'EXPENSE', sign: 1 },
      { accountType: 'EQUITY', sign: -1 },
    ],
    LIABILITY_DRAW: [{ accountType: 'LIABILITY', sign: 1 }],
    LIABILITY_REPAY: [{ accountType: 'LIABILITY', sign: -1 }],
    EQUITY_OFFSET: [{ accountType: 'EQUITY', sign: 1 }],
  },
} as const;

const POSTING_RULES_OK = validatePostingRules(POSTING_RULES);

export function asCurrency(value: string): Currency {
  if (value !== 'USD') {
    throw new Error(`Unsupported currency: ${value}`);
  }
  return value as Currency;
}

export function asAccountId(value: string): AccountId {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Invalid account id: ${value}`);
  }
  return value as AccountId;
}

export function asTxnId(value: string): TxnId {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Invalid txn id: ${value}`);
  }
  return value as TxnId;
}

export function asNonZeroAmount(value: number): NonZeroAmount {
  if (!Number.isInteger(value) || value === 0) {
    throw new Error(`Invalid non-zero amount: ${value}`);
  }
  return value as NonZeroAmount;
}

export function balancePostings(postings: ReadonlyArray<Posting>): BalancedPostings {
  if (postings.length < 2) {
    throw new Error('Transactions require at least two postings');
  }
  let total = 0;
  const currency = postings[0]?.currency;
  if (currency === undefined) {
    throw new Error('Postings require a currency');
  }
  for (const posting of postings) {
    if (!Number.isInteger(posting.amount) || posting.amount === 0) {
      throw new Error('Postings must be non-zero integer amounts');
    }
    if (posting.currency !== currency) {
      throw new Error('Postings must share a single currency');
    }
    total += posting.amount;
  }
  if (total !== 0) {
    throw new Error(`Unbalanced postings sum to ${total}`);
  }
  return postings as BalancedPostings;
}

export function createLedgerState(accounts: Account[], currency: Currency): LedgerState {
  const accountMap = new Map<AccountId, Account>();
  const balances = new Map<AccountId, number>();
  for (const account of accounts) {
    if (account.currency !== currency) {
      throw new Error(`Account currency mismatch for ${account.id}`);
    }
    accountMap.set(account.id, account);
    balances.set(account.id, 0);
  }
  return {
    currency,
    accounts: accountMap,
    txns: [],
    externalIndex: new Map<string, TxnId>(),
    balances,
  };
}

export function createTransaction(
  input: {
    id: TxnId;
    type: TxnType;
    postings: BalancedPostings;
    effectiveAtMs: number;
    externalId?: string | null;
  },
  ledger: { accounts: Map<AccountId, Account>; currency: Currency }
): Transaction {
  if (!Number.isInteger(input.effectiveAtMs) || input.effectiveAtMs < 0) {
    throw new Error(`Invalid effectiveAtMs: ${input.effectiveAtMs}`);
  }
  const balanced = balancePostings(input.postings);
  for (const posting of balanced) {
    const account = ledger.accounts.get(posting.accountId);
    if (account === undefined) {
      throw new Error(`Unknown account: ${posting.accountId}`);
    }
    if (posting.currency !== ledger.currency || posting.currency !== account.currency) {
      throw new Error(`Currency mismatch for account: ${posting.accountId}`);
    }
    if (!isAllowedPosting(account.type, posting.amount, input.type, posting.role)) {
      throw new Error(`Disallowed posting for ${posting.accountId} in ${input.type}`);
    }
  }
  return {
    id: input.id,
    type: input.type,
    postings: balanced,
    effectiveAtMs: input.effectiveAtMs,
    externalId: input.externalId ?? null,
  };
}

export function reverseTransaction(
  original: Transaction,
  reversalId: TxnId,
  nowMs: number,
  externalId: string | null
): Transaction {
  const postings = original.postings.map((posting) => ({
    ...posting,
    amount: asNonZeroAmount(posting.amount * -1),
  }));
  return {
    id: reversalId,
    type: 'REVERSAL',
    postings: balancePostings(postings),
    effectiveAtMs: nowMs,
    externalId,
  };
}

export function applyLedgerEvent(state: LedgerState, event: LedgerEvent): LedgerState {
  if (event.type === 'RECOMPUTE') {
    return { ...state, balances: computeBalances(state.accounts, state.txns) };
  }

  const externalId = event.txn.externalId;
  if (externalId !== null) {
    const existing = state.externalIndex.get(externalId);
    if (existing !== undefined) {
      if (existing === event.txn.id) {
        return state;
      }
      throw new Error(`External id already mapped: ${externalId}`);
    }
  }
  const txns = [...state.txns, event.txn];
  const balances = applyTxnToBalances(state.balances, event.txn);
  const externalIndex = new Map(state.externalIndex);
  if (externalId !== null) {
    externalIndex.set(externalId, event.txn.id);
  }
  return {
    ...state,
    txns,
    balances,
    externalIndex,
  };
}

export function replayLedgerEvents(
  accounts: Account[],
  currency: Currency,
  events: LedgerEvent[]
): LedgerState {
  let state = createLedgerState(accounts, currency);
  for (const event of events) {
    state = applyLedgerEvent(state, event);
  }
  return state;
}

export function computeBalances(
  accounts: Map<AccountId, Account>,
  txns: Transaction[]
): Map<AccountId, number> {
  const balances = new Map<AccountId, number>();
  for (const accountId of accounts.keys()) {
    balances.set(accountId, 0);
  }
  for (const txn of txns) {
    for (const posting of txn.postings) {
      const current = balances.get(posting.accountId) ?? 0;
      balances.set(posting.accountId, current + posting.amount);
    }
  }
  return balances;
}

export function balanceAt(txns: Transaction[], accountId: AccountId, atMs: number): number {
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

export function validateLedgerState(state: LedgerState): LedgerViolation[] {
  const violations: LedgerViolation[] = [];
  for (const txn of state.txns) {
    let total = 0;
    for (const posting of txn.postings) {
      total += posting.amount;
      if (posting.currency !== state.currency) {
        violations.push({
          invariant: 'I7',
          message: `Currency mismatch in txn ${txn.id}`,
        });
      }
      const account = state.accounts.get(posting.accountId);
      if (account !== undefined) {
        if (!isAllowedPosting(account.type, posting.amount, txn.type, posting.role)) {
          violations.push({
            invariant: 'I5',
            message: `Sign not allowed for ${posting.accountId} in ${txn.type}`,
          });
        }
      }
    }
    if (total !== 0) {
      violations.push({
        invariant: 'I1',
        message: `Unbalanced txn ${txn.id} sum=${total}`,
      });
    }
  }

  const balances = state.balances;
  for (const [accountId, account] of state.accounts.entries()) {
    if (!account.noOverdraft) continue;
    const balance = balances.get(accountId) ?? 0;
    if (balance < 0) {
      violations.push({
        invariant: 'I4',
        message: `Account ${accountId} is negative`,
      });
    }
  }

  for (const [externalId, txnId] of state.externalIndex.entries()) {
    const txn = state.txns.find((candidate) => candidate.id === txnId);
    if (txn === undefined) {
      violations.push({
        invariant: 'I9',
        message: `External id ${externalId} maps to missing txn ${txnId}`,
      });
      continue;
    }
    if (txn.externalId !== externalId) {
      violations.push({
        invariant: 'I9',
        message: `External id ${externalId} mismatched on txn ${txnId}`,
      });
    }
  }

  for (const txn of state.txns) {
    if (txn.externalId === null) continue;
    const mapped = state.externalIndex.get(txn.externalId);
    if (mapped !== txn.id) {
      violations.push({
        invariant: 'I9',
        message: `External id ${txn.externalId} missing for txn ${txn.id}`,
      });
    }
  }

  return violations;
}

export function getTxnByExternalId(state: LedgerState, externalId: string): Transaction {
  const txnId = state.externalIndex.get(externalId);
  if (txnId === undefined) {
    throw new Error(`Unknown external id: ${externalId}`);
  }
  const txn = state.txns.find((candidate) => candidate.id === txnId);
  if (txn === undefined) {
    throw new Error(`Missing txn for external id ${externalId}`);
  }
  return txn;
}

function applyTxnToBalances(
  balances: Map<AccountId, number>,
  txn: Transaction
): Map<AccountId, number> {
  const next = new Map<AccountId, number>(balances);
  for (const posting of txn.postings) {
    const current = next.get(posting.accountId) ?? 0;
    next.set(posting.accountId, current + posting.amount);
  }
  return next;
}

function isAllowedPosting(
  accountType: AccountType,
  amount: number,
  txnType: TxnType,
  role: PostingRole
): boolean {
  if (amount === 0) return false;
  if (POSTING_RULES_OK === false) return false;
  const rules = POSTING_RULES[txnType][role];
  if (rules.length === 0) return false;
  const sign = amount > 0 ? 1 : -1;
  return rules.some((rule) => rule.accountType === accountType && rule.sign === sign);
}

function validatePostingRules(rules: PostingRuleMatrix): boolean {
  for (const [txnType, roleMap] of Object.entries(rules)) {
    for (const [role, entries] of Object.entries(roleMap)) {
      const seen = new Set<string>();
      for (const entry of entries) {
        const key = `${entry.accountType}:${entry.sign}`;
        if (seen.has(key)) {
          throw new Error(`Duplicate posting rule for ${txnType}/${role}: ${key}`);
        }
        if (entry.sign !== 1 && entry.sign !== -1) {
          throw new Error(`Invalid sign for ${txnType}/${role}: ${entry.sign}`);
        }
        seen.add(key);
      }
    }
  }
  return true;
}

void POSTING_RULES_OK;
