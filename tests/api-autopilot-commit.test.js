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
    '@/lib/autopilot/service',
    '@/lib/user-context',
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

async function runCommitValidAndIdempotent() {
  resetModules();
  mockNextServer();
  const logEvents = [];
  let calls = 0;
  mockModule(requireModule.resolve('@/lib/log'), {
    logGuardrailEvent: (event) => logEvents.push(event),
    logInvariantViolation: () => {},
  });
  mockModule(requireModule.resolve('@/lib/autopilot/service'), {
    commitAutopilotDecision: async () => {
      calls += 1;
      return {
        decisionId: 'decision-1',
        transactionId: 'txn-1',
        bucket: null,
        status: calls === 1 ? 'created' : 'already_exists',
      };
    },
  });
  mockModule(requireModule.resolve('@/lib/user-context'), {
    resolveUserContext: async () => ({ userId: 'user-1', mode: 'AUTHENTICATED', email: null }),
  });

  const { POST } =
    requireModule('../app/api/autopilot/commit/route');

  const firstResponse = await POST({
    json: async () => ({
      decisionId: 'decision-1',
      merchant: 'Cafe',
      amountCents: 1_000,
      cardId: 'card-1',
      occurredAt: '2024-01-10T00:00:00.000Z',
    }),
  });
  const firstBody = await firstResponse.json();

  assert.equal(firstResponse.status, 200);
  assert.equal(firstBody.status, 'created');

  const secondResponse = await POST({
    json: async () => ({
      decisionId: 'decision-1',
      merchant: 'Cafe',
      amountCents: 1_000,
      cardId: 'card-1',
      occurredAt: '2024-01-10T00:00:00.000Z',
    }),
  });
  const secondBody = await secondResponse.json();

  assert.equal(secondResponse.status, 200);
  assert.equal(secondBody.status, 'already_exists');
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
  mockModule(requireModule.resolve('@/lib/autopilot/service'), {
    commitAutopilotDecision: async () => ({
      decisionId: 'decision-1',
      transactionId: 'txn-1',
      bucket: null,
      status: 'created',
    }),
  });
  mockModule(requireModule.resolve('@/lib/user-context'), {
    resolveUserContext: async () => ({ userId: 'user-1', mode: 'AUTHENTICATED', email: null }),
  });

  const { POST } =
    requireModule('../app/api/autopilot/commit/route');

  const res = await POST({
    json: async () => ({
      merchant: '',
      amountCents: -10,
      cardId: '',
      occurredAt: 'not-a-date',
      decisionId: '',
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
  mockModule(requireModule.resolve('@/lib/autopilot/service'), {
    commitAutopilotDecision: async () => ({
      decisionId: 'decision-unauth',
      transactionId: 'txn-unauth',
      bucket: null,
      status: 'created',
    }),
  });
  mockModule(requireModule.resolve('@/lib/user-context'), {
    resolveUserContext: async () => {
      throw new Error('Unauthorized');
    },
  });

  const { POST } =
    requireModule('../app/api/autopilot/commit/route');

  const res = await POST({
    json: async () => ({
      decisionId: 'decision-unauth',
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
