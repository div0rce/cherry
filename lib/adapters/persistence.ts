export type SessionStatus = 'PENDING' | 'ACTIVE' | 'FINAL';

export type SessionRecord = {
  id: string;
  userId: string;
  status: SessionStatus;
  createdAtMs: number;
  updatedAtMs: number;
};

export type SessionCreateInput = {
  userId: string;
  status: SessionStatus;
  metadata?: Record<string, unknown>;
};

export type SessionUpdateInput = {
  status?: SessionStatus;
  metadata?: Record<string, unknown> | null;
};

export type SessionStore = {
  getById(id: string): Promise<SessionRecord | null>;
  listForUser(userId: string): Promise<SessionRecord[]>;
  create(input: SessionCreateInput): Promise<SessionRecord>;
  update(id: string, input: SessionUpdateInput): Promise<SessionRecord>;
};

export type LedgerStatus = 'POSTED' | 'VOID' | 'PENDING';

export type LedgerEntry = {
  id: string;
  userId: string;
  sessionId: string | null;
  points: number;
  status: LedgerStatus;
  createdAtMs: number;
};

export type LedgerAppendInput = {
  userId: string;
  sessionId: string | null;
  points: number;
  status: LedgerStatus;
  metadata?: Record<string, unknown>;
};

export type LedgerStore = {
  append(input: LedgerAppendInput): Promise<LedgerEntry>;
  listForSession(sessionId: string): Promise<LedgerEntry[]>;
  listForUser(userId: string): Promise<LedgerEntry[]>;
};

export type BankTxnDirection = 'IN' | 'OUT';

export type BankTxn = {
  id: string;
  userId: string;
  amountMinor: number;
  direction: BankTxnDirection;
  description: string;
  rawDescription: string | null;
  postedAtMs: number | null;
  occurredAtMs: number | null;
  mcc: string | null;
  source: string;
};

export type BankTxnListOptions = {
  source?: string[];
  orderByPostedAt?: 'asc' | 'desc';
};

export type BankTxnStore = {
  listForUser(userId: string, options?: BankTxnListOptions): Promise<BankTxn[]>;
};

export type IdempotencyRecord = {
  key: string;
  userId: string;
  createdAtMs: number;
  payload: Record<string, unknown>;
};

export type IdempotencyStore = {
  get(userId: string, key: string): Promise<IdempotencyRecord | null>;
  put(record: IdempotencyRecord): Promise<void>;
};
