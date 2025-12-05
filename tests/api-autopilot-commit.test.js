import assert from 'node:assert/strict';
import Module from 'node:module';

const requireModule = Module.createRequire(__filename);

function mockModule(modulePath, exports) {
  requireModule.cache[modulePath] = {
    id: modulePath,
    filename: modulePath,
    loaded: true,
    exports,
  };
}

function mockNextServer() {
  class MockResponse extends Response {
    static json(body, init = {}) {
      return new Response(JSON.stringify(body), {
        status: init.status ?? 200,
        headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
      });
    }
  }
  const exports = {
    NextResponse: MockResponse,
    NextRequest: class extends Request {},
  };
  const resolved = requireModule.resolve('next/server');
  mockModule(resolved, exports);
  const withoutJs = resolved.replace(/\.js$/, '');
  mockModule(withoutJs, exports);
  try {
    const alt = requireModule.resolve('next/server.js');
    mockModule(alt, exports);
  } catch {
    // ignore
  }
}

function resetModules() {
  const targets = [
    '../app/api/autopilot/commit/route',
    'next/server',
    '@/lib/log',
    '@/lib/prisma',
    '@/lib/engine',
    '@/lib/user-context',
    '@/lib/ids',
    '@/lib/buckets/ensure-fresh',
    '@/lib/scan-helpers',
  ];
  for (const target of targets) {
    try {
      const resolved = requireModule.resolve(target);
      delete requireModule.cache[resolved];
    } catch {
      // ignore missing
    }
  }
}

function buildBucket() {
  return {
    id: 'bucket-1',
    userId: 'user-1',
    name: 'Dining',
    period: 'MONTHLY',
    budgetAmount: 10_000,
    currentAmount: 9_000,
    spentCents: 1_000,
    strictMode: false,
    category: 'DINING',
    periodStart: new Date('2024-01-01T00:00:00.000Z'),
    periodEnd: new Date('2024-01-31T00:00:00.000Z'),
    lastResetAt: null,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  };
}

async function runCommitValidAndIdempotent() {
  resetModules();
  mockNextServer();
  const logEvents = [];
  const bucketStore = buildBucket();
  const transactions = {};

  mockModule(requireModule.resolve('@/lib/log'), {
    logGuardrailEvent: (event) => logEvents.push(event),
    logInvariantViolation: () => {},
  });
  mockModule(requireModule.resolve('@/lib/prisma'), {
    prisma: {
      card: {
        findMany: async () => [{ id: 'card-1', nickname: 'Alpha' }],
      },
      $transaction: async (cb) => {
        const tx = {
          bucket: {
            findUnique: async ({ where }) => (where.id === bucketStore.id ? bucketStore : null),
            update: async ({ data }) => {
              Object.assign(bucketStore, data);
              return bucketStore;
            },
          },
          simulatedTransaction: {
            findUnique: async ({ where }) => transactions[where.id] ?? null,
            create: async ({ data }) => {
              transactions[data.id] = { id: data.id, bucketId: data.bucketId ?? null };
              return transactions[data.id];
            },
          },
        };
        return cb(tx);
      },
    },
  });
  mockModule(requireModule.resolve('@/lib/engine'), {
    getAutopilotDecisionForUserSwipe: async () => ({
      kind: 'OK',
      cardId: 'card-1',
      reasonCode: 'MAX_REWARDS',
      userFacingMessage: 'ok',
      expectedMonetaryBenefitCents: 50,
      bucketDelta: {
        bucketId: 'bucket-1',
        newSpentCents: 2_000,
        newRemainingCents: 8_000,
      },
    }),
  });
  mockModule(requireModule.resolve('@/lib/user-context'), {
    resolveUserContext: async () => ({ userId: 'user-1', mode: 'AUTHENTICATED', email: null }),
  });
  mockModule(requireModule.resolve('@/lib/ids'), {
    buildSwipeIdempotencyKey: () => 'swipe-key-1',
  });
  mockModule(requireModule.resolve('@/lib/buckets/ensure-fresh'), {
    ensureBucketFresh: async (_id, _now, db) => db.bucket.findUnique({ where: { id: 'bucket-1' } }),
  });
  mockModule(requireModule.resolve('@/lib/scan-helpers'), {
    resolveScanCategory: async () => 'DINING',
  });

  const { POST } =
    requireModule('../app/api/autopilot/commit/route');

  const firstResponse = await POST({
    json: async () => ({
      merchant: 'Cafe',
      amountCents: 1_000,
      cardId: 'card-1',
      occurredAt: '2024-01-10T00:00:00.000Z',
    }),
  });
  const firstBody = await firstResponse.json();

  assert.equal(firstResponse.status, 200);
  assert.ok(firstBody.bucket);
  assert.equal(firstBody.bucket.spentCents, 2_000);

  const secondResponse = await POST({
    json: async () => ({
      merchant: 'Cafe',
      amountCents: 1_000,
      cardId: 'card-1',
      occurredAt: '2024-01-10T00:00:00.000Z',
    }),
  });
  const secondBody = await secondResponse.json();

  assert.equal(secondResponse.status, 200);
  assert.ok(secondBody.bucket);
  assert.equal(secondBody.bucket.spentCents, 2_000);
  assert.equal(logEvents.filter((e) => e?.kind === 'DECISION_BLOCKED').length, 0);
}

async function runCommitInvalid() {
  resetModules();
  mockNextServer();
  const logEvents = [];
  mockModule(requireModule.resolve('@/lib/log'), {
    logGuardrailEvent: (event) => logEvents.push(event),
    logInvariantViolation: () => {},
  });
  mockModule(requireModule.resolve('@/lib/prisma'), {
    prisma: {
      card: {
        findMany: async () => [],
      },
      $transaction: async (cb) => cb({}),
    },
  });
  mockModule(requireModule.resolve('@/lib/engine'), {
    getAutopilotDecisionForUserSwipe: async () => ({
      kind: 'OK',
      cardId: 'card-1',
      reasonCode: 'OK',
      userFacingMessage: 'ok',
      expectedMonetaryBenefitCents: 0,
      bucketDelta: null,
    }),
  });
  mockModule(requireModule.resolve('@/lib/user-context'), {
    resolveUserContext: async () => ({ userId: 'user-1', mode: 'AUTHENTICATED', email: null }),
  });
  mockModule(requireModule.resolve('@/lib/ids'), {
    buildSwipeIdempotencyKey: () => 'swipe-key-invalid',
  });
  mockModule(requireModule.resolve('@/lib/buckets/ensure-fresh'), {
    ensureBucketFresh: async () => null,
  });
  mockModule(requireModule.resolve('@/lib/scan-helpers'), {
    resolveScanCategory: async () => 'DINING',
  });

  const { POST } =
    requireModule('../app/api/autopilot/commit/route');

  const res = await POST({
    json: async () => ({
      merchant: '',
      amountCents: -10,
      cardId: 'card-unknown',
      occurredAt: 'not-a-date',
    }),
  });
  await res.json();

  assert.equal(res.status, 400);
  const lastEvent = logEvents.at(-1);
  assert.equal(lastEvent?.kind, 'INPUT_INVALID');
}

async function runCommitUnauthorized() {
  resetModules();
  mockNextServer();
  mockModule(requireModule.resolve('@/lib/log'), {
    logGuardrailEvent: () => {},
    logInvariantViolation: () => {},
  });
  mockModule(requireModule.resolve('@/lib/prisma'), {
    prisma: {
      card: {
        findMany: async () => [],
      },
      $transaction: async (cb) => cb({}),
    },
  });
  mockModule(requireModule.resolve('@/lib/engine'), {
    getAutopilotDecisionForUserSwipe: async () => ({
      kind: 'BLOCKED',
      cardId: null,
      reasonCode: 'NO_USER',
      userFacingMessage: 'blocked',
      expectedMonetaryBenefitCents: 0,
      bucketDelta: null,
    }),
  });
  mockModule(requireModule.resolve('@/lib/user-context'), {
    resolveUserContext: async () => {
      throw new Error('Unauthorized');
    },
  });
  mockModule(requireModule.resolve('@/lib/ids'), {
    buildSwipeIdempotencyKey: () => 'unauth',
  });
  mockModule(requireModule.resolve('@/lib/buckets/ensure-fresh'), {
    ensureBucketFresh: async () => null,
  });
  mockModule(requireModule.resolve('@/lib/scan-helpers'), {
    resolveScanCategory: async () => 'DINING',
  });

  const { POST } =
    requireModule('../app/api/autopilot/commit/route');

  const res = await POST({
    json: async () => ({
      merchant: 'Cafe',
      amountCents: 1_000,
      cardId: 'card-1',
      occurredAt: '2024-01-10T00:00:00.000Z',
    }),
  });
  await res.json();

  assert.equal(res.status, 401);
}

async function run() {
  await runCommitValidAndIdempotent();
  await runCommitInvalid();
  await runCommitUnauthorized();
  process.stdout.write('api-autopilot-commit: ok\n');
}

run().catch((err) => {
  const message =
    err instanceof Error ? err.stack ?? err.message : typeof err === 'string' ? err : JSON.stringify(err);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
