import type { World } from '../lib/adapters/world.js';
import type {
  BankTxn,
  LedgerEntry,
  SessionRecord,
} from '../lib/adapters/persistence.js';

const nowMs = 0;

const session: SessionRecord = {
  id: 'session-1',
  userId: 'user-1',
  status: 'PENDING',
  createdAtMs: nowMs,
  updatedAtMs: nowMs,
};

const ledgerEntry: LedgerEntry = {
  id: 'ledger-1',
  userId: 'user-1',
  sessionId: 'session-1',
  points: 10,
  status: 'POSTED',
  createdAtMs: nowMs,
};

const bankTxn: BankTxn = {
  id: 'txn-1',
  userId: 'user-1',
  amountMinor: 500,
  direction: 'OUT',
  description: 'Test purchase',
  rawDescription: null,
  postedAtMs: nowMs,
  occurredAtMs: nowMs,
  mcc: null,
  source: 'csv_dev',
};

const world: World = {
  clock: { nowMs: () => 0 },
  logger: {
    info: () => {},
    warn: () => {},
    error: () => {},
  },
  entropy: {
    randomBytes: (length) => new Uint8Array(length),
  },
  digest: {
    sha256: () => 'hash',
  },
  config: { get: () => undefined },
  stores: {
    sessions: {
      getById: async () => session,
      listForUser: async () => [session],
      create: async () => session,
      update: async () => session,
    },
    ledger: {
      append: async () => ledgerEntry,
      listForSession: async () => [ledgerEntry],
      listForUser: async () => [ledgerEntry],
    },
    bank: {
      listForUser: async () => [bankTxn],
    },
    idempotency: {
      get: async () => null,
      put: async () => {},
    },
  },
  http: {
    fetch: async () => ({
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => '',
    }),
  },
};

async function run(): Promise<void> {
  void world;
  console.warn('adapters-contracts: ok');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
