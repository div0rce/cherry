/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');

function mockModule(modulePath, exports) {
  require.cache[require.resolve(modulePath)] = {
    id: modulePath,
    filename: modulePath,
    loaded: true,
    exports,
  };
}

async function testIdempotentUpsert() {
  const bankRows = new Map();
  const userMap = new Map([['acct-1', 'user-1']]);

  mockModule('../lib/prisma', {
    prisma: {
      bankTransaction: {
        findUnique: async ({ where }) => (bankRows.has(where.id) ? { id: where.id } : null),
        upsert: async ({ where, create, update }) => {
          if (bankRows.has(where.id)) {
            bankRows.set(where.id, { ...bankRows.get(where.id), ...update });
            return bankRows.get(where.id);
          }
          bankRows.set(where.id, { ...create });
          return bankRows.get(where.id);
        },
      },
      merchantObservation: {
        findFirst: async () => null,
        create: async () => ({ id: 'mo-1' }),
      },
    },
  });

  mockModule('../lib/bank/user-link', {
    resolveUserIdForExternalIds: async ({ accountExternalId }) =>
      userMap.get(accountExternalId) ?? null,
  });
  mockModule('../lib/logger', {
    logInfo: () => {},
    logWarn: () => {},
  });

  delete require.cache[require.resolve('../lib/bank/ingest')];
  const { ingestBankTransactions } = require('../lib/bank/ingest');

  const payload = [
    {
      externalId: 'tx-1',
      accountExternalId: 'acct-1',
      amountCents: 2500,
      currency: 'USD',
      occurredAt: new Date('2024-01-01T00:00:00Z'),
      description: 'Groceries',
      merchantName: 'Safeway',
      mcc: '5411',
    },
  ];

  const first = await ingestBankTransactions(payload);
  assert.deepEqual(first, { ingested: 1, duplicates: 0, skipped: 0 });
  assert.equal(bankRows.size, 1);
  const stored = bankRows.get('tx-1');
  assert.equal(stored.direction, 'DEBIT');

  const second = await ingestBankTransactions(payload);
  assert.deepEqual(second, { ingested: 0, duplicates: 1, skipped: 0 });
  assert.equal(bankRows.size, 1);
}

async function testMissingUserSkips() {
  mockModule('../lib/prisma', {
    prisma: {
      bankTransaction: {
        findUnique: async () => null,
        upsert: async () => {
          throw new Error('should not upsert');
        },
      },
      merchantObservation: {
        findFirst: async () => null,
        create: async () => ({ id: 'mo-1' }),
      },
    },
  });

  mockModule('../lib/bank/user-link', {
    resolveUserIdForExternalIds: async () => null,
  });
  mockModule('../lib/logger', {
    logInfo: () => {},
    logWarn: () => {},
  });

  delete require.cache[require.resolve('../lib/bank/ingest')];
  const { ingestBankTransactions } = require('../lib/bank/ingest');

  const payload = [
    {
      externalId: 'tx-missing-user',
      accountExternalId: 'acct-missing',
      amountCents: 1000,
      currency: 'USD',
      occurredAt: new Date(),
      description: 'Unknown',
    },
  ];

  const result = await ingestBankTransactions(payload);
  assert.deepEqual(result, { ingested: 0, duplicates: 0, skipped: 1 });
}

async function run() {
  await testIdempotentUpsert();
  await testMissingUserSkips();
  console.warn('bank ingest: ok');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
