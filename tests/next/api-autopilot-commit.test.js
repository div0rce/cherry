import * as assert from 'node:assert/strict';
import * as Module from 'node:module';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
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
    const alt = requireModule.resolve('next/server');
    mockModule(alt, exports);
  } catch {
    // ignore
  }
}

const originalAutopilotCommitFlag = process.env.AUTOPILOT_COMMIT_V2;

function resetModules() {
  const targets = [
    '../../app/api/autopilot/commit/route',
    'next/server',
    '../../lib/log',
    '../../lib/autopilot/service',
    '../../lib/user-context',
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
  process.env.AUTOPILOT_COMMIT_V2 = 'false';
  resetModules();
  mockNextServer();
  const logEvents = [];
  let calls = 0;
  mockModule(requireModule.resolve('../../lib/log'), {
    logGuardrailEvent: (event) => logEvents.push(event),
    logInvariantViolation: () => {},
  });
  mockModule(requireModule.resolve('../../lib/autopilot/service'), {
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
  mockModule(requireModule.resolve('../../lib/user-context'), {
    resolveUserContext: async () => ({ userId: 'user-1', mode: 'AUTHENTICATED', email: null }),
  });

  const { POST } =
    requireModule('../../app/api/autopilot/commit/route');

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

  process.env.AUTOPILOT_COMMIT_V2 = originalAutopilotCommitFlag;
}

async function runCommitInvalid() {
  process.env.AUTOPILOT_COMMIT_V2 = 'false';
  resetModules();
  mockNextServer();
  const logEvents = [];
  mockModule(requireModule.resolve('../../lib/log'), {
    logGuardrailEvent: (event) => logEvents.push(event),
    logInvariantViolation: () => {},
  });
  mockModule(requireModule.resolve('../../lib/autopilot/service'), {
    commitAutopilotDecision: async () => ({
      decisionId: 'decision-1',
      transactionId: 'txn-1',
      bucket: null,
      status: 'created',
    }),
  });
  mockModule(requireModule.resolve('../../lib/user-context'), {
    resolveUserContext: async () => ({ userId: 'user-1', mode: 'AUTHENTICATED', email: null }),
  });

  const { POST } =
    requireModule('../../app/api/autopilot/commit/route');

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

  process.env.AUTOPILOT_COMMIT_V2 = originalAutopilotCommitFlag;
}

async function runCommitUnauthorized() {
  process.env.AUTOPILOT_COMMIT_V2 = 'false';
  resetModules();
  mockNextServer();
  mockModule(requireModule.resolve('../../lib/log'), {
    logGuardrailEvent: () => {},
    logInvariantViolation: () => {},
  });
  mockModule(requireModule.resolve('../../lib/autopilot/service'), {
    commitAutopilotDecision: async () => ({
      decisionId: 'decision-unauth',
      transactionId: 'txn-unauth',
      bucket: null,
      status: 'created',
    }),
  });
  mockModule(requireModule.resolve('../../lib/user-context'), {
    resolveUserContext: async () => {
      const { AppError } = requireModule('../../lib/errors');
      throw new AppError('UNAUTHORIZED', 'Unauthorized', 401);
    },
  });

  const { POST } =
    requireModule('../../app/api/autopilot/commit/route');

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

  process.env.AUTOPILOT_COMMIT_V2 = originalAutopilotCommitFlag;
}

async function runCommitV2Flagged() {
  resetModules();
  mockNextServer();
  const logEvents = [];
  const calls = [];
  const originalFlag = process.env.AUTOPILOT_COMMIT_V2;
  process.env.AUTOPILOT_COMMIT_V2 = 'true';
  try {
    mockModule(requireModule.resolve('../../lib/log'), {
      logGuardrailEvent: (event) => logEvents.push(event),
      logInvariantViolation: () => {},
    });
    mockModule(requireModule.resolve('../../lib/autopilot/service'), {
      commitAutopilotDecision: async () => {
        throw new Error('v1 path should not be called when flag enabled');
      },
      commitAutopilotDecisionV2: async () => {
        calls.push('v2');
        return {
          decisionId: 'decision-v2',
          sessionId: 'session-2',
          bucket: null,
          status: 'created',
        };
      },
    });
    mockModule(requireModule.resolve('../../lib/user-context'), {
      resolveUserContext: async () => ({ userId: 'user-v2', mode: 'AUTHENTICATED', email: null }),
    });

    const { POST } =
      requireModule('../../app/api/autopilot/commit/route');

    const res = await POST({
      json: async () => ({
        decisionId: 'decision-v2',
        merchant: 'Cafe',
        amountCents: 1_000,
        cardId: 'card-v2',
        occurredAt: '2024-01-10T00:00:00.000Z',
      }),
    });
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.sessionId, 'session-2');
    assert.deepEqual(calls, ['v2']);
    assert.equal(logEvents.filter((e) => e?.kind === 'DECISION_BLOCKED').length, 0);
  } finally {
    process.env.AUTOPILOT_COMMIT_V2 = originalFlag;
  }
}

async function run() {
  await runCommitValidAndIdempotent();
  await runCommitInvalid();
  await runCommitUnauthorized();
  await runCommitV2Flagged();
  process.stdout.write('api-autopilot-commit: ok\n');
}

run().catch((err) => {
  const message =
    err instanceof Error ? err.stack ?? err.message : typeof err === 'string' ? err : JSON.stringify(err);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
