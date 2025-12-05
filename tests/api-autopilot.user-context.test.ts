import assert from 'node:assert/strict';
import Module from 'node:module';

const requireModule = Module.createRequire(__filename);

function mockModule(modulePath: string, exports: unknown): void {
  requireModule.cache[modulePath] = {
    id: modulePath,
    filename: modulePath,
    loaded: true,
    exports,
  } as NodeModule;
}

function mockNextServer(): void {
  class MockResponse extends Response {
    static override json(body: unknown, init: ResponseInit = {}): Response {
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

function resetModules(): void {
  const targets = [
    '../app/api/autopilot/preview/route',
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
      // ignore
    }
  }
}

async function runUserContextPreview(): Promise<void> {
  resetModules();
  mockNextServer();
  const capturedOptions: unknown[] = [];
  mockModule(requireModule.resolve('@/lib/log'), {
    logGuardrailEvent: (): void => {},
  });
  mockModule(requireModule.resolve('@/lib/prisma'), {
    prisma: {
      card: {
        findMany: async () => [{ id: 'card-1' }],
      },
    },
  });
  mockModule(requireModule.resolve('@/lib/engine'), {
    getAutopilotDecisionForUserSwipe: async () => ({
      kind: 'OK',
      cardId: 'card-1',
      reasonCode: 'OK',
      userFacingMessage: 'ok',
      expectedMonetaryBenefitCents: 10,
      bucketDelta: null,
    }),
  });
  mockModule(requireModule.resolve('@/lib/user-context'), {
    resolveUserContext: async (opts: unknown) => {
      capturedOptions.push(opts);
      return { userId: 'user-ctx-1', mode: 'AUTHENTICATED', email: null };
    },
  });

  const { POST } =
    requireModule('../app/api/autopilot/preview/route') as typeof import('../app/api/autopilot/preview/route');

  const res = await POST({
    json: async () => ({ merchant: 'Shop', amountCents: 500 }),
  } as never);
  await res.json();

  assert.equal(res.status, 200);
  const opts = capturedOptions[0] as { requireAuth?: boolean; allowLabDemo?: boolean };
  assert.equal(opts.requireAuth, true);
  assert.equal(opts.allowLabDemo, true);
}

async function runUserContextCommit(): Promise<void> {
  resetModules();
  mockNextServer();
  const capturedOptions: unknown[] = [];
  mockModule(requireModule.resolve('@/lib/log'), {
    logGuardrailEvent: (): void => {},
  });
  mockModule(requireModule.resolve('@/lib/prisma'), {
    prisma: {
      card: {
        findMany: async () => [{ id: 'card-1', nickname: 'Alpha' }],
      },
      $transaction: async (cb: (tx: unknown) => Promise<unknown>) =>
        cb({
          simulatedTransaction: {
            findUnique: async () => null,
            create: async ({ data }: { data: { id: string; bucketId?: string | null } }) => ({
              id: data.id,
              bucketId: data.bucketId ?? null,
            }),
          },
          bucket: {
            findUnique: async () => null,
            update: async (args: unknown) => args,
          },
        }),
    },
  });
  mockModule(requireModule.resolve('@/lib/engine'), {
    getAutopilotDecisionForUserSwipe: async () => ({
      kind: 'OK',
      cardId: 'card-1',
      reasonCode: 'OK',
      userFacingMessage: 'ok',
      expectedMonetaryBenefitCents: 10,
      bucketDelta: null,
    }),
  });
  mockModule(requireModule.resolve('@/lib/user-context'), {
    resolveUserContext: async (opts: unknown) => {
      capturedOptions.push(opts);
      return { userId: 'user-ctx-2', mode: 'AUTHENTICATED', email: null };
    },
  });
  mockModule(requireModule.resolve('@/lib/ids'), {
    buildSwipeIdempotencyKey: () => 'user-context-key',
  });
  mockModule(requireModule.resolve('@/lib/buckets/ensure-fresh'), {
    ensureBucketFresh: async () => null,
  });
  mockModule(requireModule.resolve('@/lib/scan-helpers'), {
    resolveScanCategory: async () => 'DINING',
  });

  const { POST } =
    requireModule('../app/api/autopilot/commit/route') as typeof import('../app/api/autopilot/commit/route');

  const res = await POST({
    json: async () => ({
      merchant: 'Shop',
      amountCents: 500,
      cardId: 'card-1',
      occurredAt: '2024-01-10T00:00:00.000Z',
    }),
  } as never);
  await res.json();

  assert.equal(res.status, 200);
  const opts = capturedOptions[0] as { requireAuth?: boolean; allowLabDemo?: boolean };
  assert.equal(opts.requireAuth, true);
  assert.equal(opts.allowLabDemo, true);
}

async function run(): Promise<void> {
  await runUserContextPreview();
  await runUserContextCommit();
  process.stdout.write('api-autopilot-user-context: ok\n');
}

run().catch((err) => {
  const message =
    err instanceof Error ? err.stack ?? err.message : typeof err === 'string' ? err : JSON.stringify(err);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
