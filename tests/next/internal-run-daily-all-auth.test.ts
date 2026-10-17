import * as assert from 'node:assert/strict';
import { NextRequest } from 'next/server';

// /api/internal/run-daily-all processes every user, so it must require the cron secret rather
// than any user session, and fail closed when the secret is missing or weak.

const { GET, POST } = await import('../../app/api/internal/run-daily-all/route.js');
const { runDailyForUser } = await import('../../lib/daily-state/runDailyForUser.js');
const SECRET = 'cron-secret-for-tests-0123456789abcdef';

function call(authorization?: string, body = '{}'): Promise<Response> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (authorization !== undefined) headers['authorization'] = authorization;
  return POST(
    new NextRequest('http://localhost/api/internal/run-daily-all', { method: 'POST', headers, body })
  );
}

function callGet(authorization?: string): Promise<Response> {
  const headers: Record<string, string> = {};
  if (authorization !== undefined) headers['authorization'] = authorization;
  return GET(new NextRequest('http://localhost/api/internal/run-daily-all', { method: 'GET', headers }));
}

// The feature flag stays off so an authorized call stops at 403 before any DB work.
process.env['CHERRY_DAILYSTATE_CRON_ENABLED'] = 'false';

delete process.env['CRON_SECRET'];
assert.equal((await call('Bearer ')).status, 401, 'unset secret must fail closed');
assert.equal((await call('Bearer undefined')).status, 401, 'unset secret must fail closed');

process.env['CRON_SECRET'] = 'too-short';
assert.equal((await call('Bearer too-short')).status, 401, 'weak secret must fail closed');

process.env['CRON_SECRET'] = SECRET;
assert.equal((await call()).status, 401, 'missing header');
assert.equal((await call(SECRET)).status, 401, 'missing Bearer scheme');
assert.equal((await call(`Bearer ${SECRET}x`)).status, 401, 'wrong secret');
assert.equal((await call(`Bearer ${SECRET}`)).status, 403, 'correct secret reaches the feature flag');

// Vercel Cron uses GET with no body; same auth.
assert.equal((await callGet()).status, 401, 'GET without secret');
assert.equal((await callGet(`Bearer ${SECRET}`)).status, 403, 'GET with secret reaches the feature flag');

// A future date would roll every bucket forward and zero its spend: rejected before any DB work.
process.env['CHERRY_DAILYSTATE_CRON_ENABLED'] = 'true';
const tomorrow = new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString();
const future = await call(`Bearer ${SECRET}`, JSON.stringify({ date: tomorrow }));
assert.equal(future.status, 400, 'future date must be rejected');
assert.deepEqual(await future.json(), { error: 'future_date' });
process.env['CHERRY_DAILYSTATE_CRON_ENABLED'] = 'false';

// The shared runner refuses future dates itself, for every caller.
const nowMs = Date.UTC(2026, 9, 17, 12, 0, 0);
await assert.rejects(
  runDailyForUser({ userId: 'user-1', date: new Date(Date.UTC(2026, 9, 18)), source: 'MANUAL', nowMs }),
  /must not be in the future/
);

process.stdout.write('internal-run-daily-all-auth: ok\n');
