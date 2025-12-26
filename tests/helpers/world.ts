import crypto from 'node:crypto';
import type { World } from '../../lib/adapters/world.js';
import type {
  BankTxn,
  BankTxnStore,
  IdempotencyRecord,
  IdempotencyStore,
  LedgerEntry,
  LedgerStore,
  SessionRecord,
  SessionStore,
} from '../../lib/adapters/persistence.js';

type LogEntry = { level: 'info' | 'warn' | 'error'; message: string; meta?: unknown };

type TestWorldOptions = {
  nowMs?: number;
  randomBytesSeq?: Uint8Array[];
};

export function makeTestWorld(options: TestWorldOptions = {}): { world: World; logs: LogEntry[] } {
  const logs: LogEntry[] = [];
  const log = (level: LogEntry['level'], message: string, meta?: unknown) => {
    logs.push({ level, message, meta });
  };

  let bytesIndex = 0;
  const bytesSeq = options.randomBytesSeq ?? [];
  const nowMs = options.nowMs ?? 0;

  const sessionStore = makeSessionStore(nowMs);
  const ledgerStore = makeLedgerStore(nowMs);
  const bankStore = makeBankStore();
  const idempotencyStore = makeIdempotencyStore();

  const world: World = {
    clock: { nowMs: () => nowMs },
    entropy: {
      randomBytes: (n) => bytesSeq[bytesIndex++] ?? new Uint8Array(n),
    },
    digest: {
      sha256: (payload) => crypto.createHash('sha256').update(payload).digest('hex'),
    },
    logger: {
      info: (message, meta) => log('info', message, meta),
      warn: (message, meta) => log('warn', message, meta),
      error: (message, meta) => log('error', message, meta),
    },
    config: {
      get: () => undefined,
    },
    stores: {
      sessions: sessionStore,
      ledger: ledgerStore,
      bank: bankStore,
      idempotency: idempotencyStore,
    },
  };

  return { world, logs };
}

function makeSessionStore(nowMs: number): SessionStore {
  const records: SessionRecord[] = [];
  let counter = 1;

  return {
    getById: async (id) => records.find((record) => record.id === id) ?? null,
    listForUser: async (userId) => records.filter((record) => record.userId === userId),
    create: async (input) => {
      const record: SessionRecord = {
        id: `session-${counter++}`,
        userId: input.userId,
        status: input.status,
        createdAtMs: nowMs,
        updatedAtMs: nowMs,
      };
      records.push(record);
      return record;
    },
    update: async (id, input) => {
      const record = records.find((item) => item.id === id);
      if (!record) {
        throw new Error(`Session not found: ${id}`);
      }
      if (input.status !== undefined) record.status = input.status;
      record.updatedAtMs = nowMs;
      return record;
    },
  };
}

function makeLedgerStore(nowMs: number): LedgerStore {
  const records: LedgerEntry[] = [];
  let counter = 1;

  return {
    append: async (input) => {
      const entry: LedgerEntry = {
        id: `ledger-${counter++}`,
        userId: input.userId,
        sessionId: input.sessionId,
        points: input.points,
        status: input.status,
        createdAtMs: nowMs,
      };
      records.push(entry);
      return entry;
    },
    listForSession: async (sessionId) =>
      records.filter((entry) => entry.sessionId === sessionId),
    listForUser: async (userId) => records.filter((entry) => entry.userId === userId),
  };
}

function makeBankStore(): BankTxnStore {
  const records: BankTxn[] = [];

  return {
    listForUser: async (userId) => records.filter((record) => record.userId === userId),
  };
}

function makeIdempotencyStore(): IdempotencyStore {
  const records = new Map<string, IdempotencyRecord>();
  const toKey = (userId: string, key: string) => `${userId}:${key}`;

  return {
    get: async (userId, key) => records.get(toKey(userId, key)) ?? null,
    put: async (record) => {
      const composite = toKey(record.userId, record.key);
      if (records.has(composite)) {
        const error = new Error('Idempotency key already exists');
        (error as { code?: string }).code = 'P2002';
        throw error;
      }
      records.set(composite, record);
    },
  };
}
