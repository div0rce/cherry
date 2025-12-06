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
    '@/lib/autopilot/service',
    '@/lib/user-context',
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
  mockModule(requireModule.resolve('@/lib/autopilot/service'), {
    getAutopilotDecisionForUserSwipe: async () => ({
      decisionId: 'decision-ctx-1',
      merchant: 'Shop',
      amountCents: 500,
      occurredAt: '2024-01-01T00:00:00.000Z',
      status: 'ok',
      recommendedCard: { id: 'card-1', label: 'Alpha', issuer: 'Issuer', network: 'VISA' },
      expectedBenefitCents: 10,
      explanation: { primary: 'ok', secondary: [], warnings: [] },
      bucketImpact: null,
      reasonCode: 'OK',
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
  mockModule(requireModule.resolve('@/lib/autopilot/service'), {
    commitAutopilotDecision: async () => ({
      decisionId: 'decision-ctx-2',
      transactionId: 'txn-ctx-2',
      bucket: null,
      status: 'created',
    }),
  });
  mockModule(requireModule.resolve('@/lib/user-context'), {
    resolveUserContext: async (opts: unknown) => {
      capturedOptions.push(opts);
      return { userId: 'user-ctx-2', mode: 'AUTHENTICATED', email: null };
    },
  });

  const { POST } =
    requireModule('../app/api/autopilot/commit/route') as typeof import('../app/api/autopilot/commit/route');

  const res = await POST({
    json: async () => ({
      decisionId: 'decision-ctx-2',
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
