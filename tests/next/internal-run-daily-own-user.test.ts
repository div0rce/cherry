import * as assert from 'node:assert/strict';
import * as Module from 'node:module';
import { fileURLToPath } from 'node:url';
import { NextRequest } from 'next/server';

// POST /api/internal/run-daily runs for the signed-in user only: a body userId is rejected, an
// accepted request passes the session user's id to runDailyForUser, and future dates are refused.

const __filename = fileURLToPath(import.meta.url);
const requireModule = Module.createRequire(__filename);

function stub(specifier: string, exports: Record<string, unknown>): void {
  const resolved = requireModule.resolve(specifier);
  requireModule.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports } as NodeModule;
}

let calls: Array<{ userId: string }> = [];
const runner = requireModule('../../lib/daily-state/runDailyForUser') as Record<string, unknown>;
stub('../../lib/auth', { auth: async () => null });
stub('../../lib/user-context', { resolveUserContext: async () => ({ userId: 'user-1', mode: 'AUTHENTICATED' }) });
stub('../../lib/daily-state/runDailyForUser', {
  ...runner,
  runDailyForUser: async (args: { userId: string }) => {
    calls.push(args);
    return { status: 'SAFE', inputsVersion: null, engineVersion: null };
  },
});

const routePath = requireModule.resolve('../../app/api/internal/run-daily/route.ts');
delete requireModule.cache[routePath];
const { POST } = requireModule(routePath) as { POST: (request: NextRequest) => Promise<Response> };

function post(body: unknown): Promise<Response> {
  return POST(
    new NextRequest('http://localhost/api/internal/run-daily', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  );
}

async function run(): Promise<void> {
  process.env['CHERRY_DAILYSTATE_CRON_ENABLED'] = 'true';

  const crossUser = await post({ userId: 'someone-else' });
  assert.equal(crossUser.status, 400, 'a body userId must be rejected by the strict schema');
  assert.equal(calls.length, 0);

  const own = await post({});
  assert.equal(own.status, 200);
  assert.deepEqual(calls.map((c) => c.userId), ['user-1']);

  calls = [];
  const future = await post({ date: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString() });
  assert.equal(future.status, 400);
  assert.deepEqual(await future.json(), { error: 'future_date' });
  assert.equal(calls.length, 0);

  process.env['CHERRY_DAILYSTATE_CRON_ENABLED'] = 'false';
  process.stdout.write('internal-run-daily-own-user: ok\n');
}

void run();
