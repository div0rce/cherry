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
    '../app/api/autopilot/preview/route',
    'next/server',
    '@/lib/log',
    '@/lib/prisma',
    '@/lib/engine',
    '@/lib/user-context',
  ];
  for (const target of targets) {
    try {
      const resolved = requireModule.resolve(target);
      delete requireModule.cache[resolved];
    } catch {
      // ignore missing entries
    }
  }
}

async function runPreviewValid() {
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
        findMany: async () => [{ id: 'card-1' }],
      },
    },
  });
  mockModule(requireModule.resolve('@/lib/engine'), {
    getAutopilotDecisionForUserSwipe: async () => ({
      kind: 'OK',
      cardId: 'card-1',
      reasonCode: 'MAX_REWARDS',
      userFacingMessage: 'Use card',
      expectedMonetaryBenefitCents: 100,
      bucketDelta: null,
    }),
  });
  mockModule(requireModule.resolve('@/lib/user-context'), {
    resolveUserContext: async () => ({ userId: 'user-1', mode: 'AUTHENTICATED', email: null }),
  });
  const { POST } =
    requireModule('../app/api/autopilot/preview/route');

  const res = await POST({
    json: async () => ({ merchant: 'Test Shop', amountCents: 5_000 }),
  });
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.kind, 'OK');
  assert.equal(body.cardId, 'card-1');
  assert.equal(logEvents.length, 0);
}

async function runPreviewInvalid() {
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
    },
  });
  mockModule(requireModule.resolve('@/lib/engine'), {
    getAutopilotDecisionForUserSwipe: async () => ({
      kind: 'FALLBACK',
      cardId: null,
      reasonCode: 'NO_CARDS',
      userFacingMessage: 'fallback',
      expectedMonetaryBenefitCents: 0,
      bucketDelta: null,
    }),
  });
  mockModule(requireModule.resolve('@/lib/user-context'), {
    resolveUserContext: async () => ({ userId: 'user-1', mode: 'AUTHENTICATED', email: null }),
  });
  const { POST } =
    requireModule('../app/api/autopilot/preview/route');

  const res = await POST({
    json: async () => ({ amountCents: -1 }),
  });
  await res.json();

  assert.equal(res.status, 400);
  const lastEvent = logEvents.at(-1);
  assert.equal(lastEvent?.reason, 'INVALID_PAYLOAD');
}

async function runPreviewUnauthorized() {
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
  const { POST } =
    requireModule('../app/api/autopilot/preview/route');

  const res = await POST({
    json: async () => ({ merchant: 'Test', amountCents: 1_000 }),
  });
  await res.json();

  assert.equal(res.status, 401);
}

async function run() {
  await runPreviewValid();
  await runPreviewInvalid();
  await runPreviewUnauthorized();
  process.stdout.write('api-autopilot-preview: ok\n');
}

run().catch((err) => {
  const message =
    err instanceof Error ? err.stack ?? err.message : typeof err === 'string' ? err : JSON.stringify(err);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
