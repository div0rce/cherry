import * as assert from 'node:assert/strict';
import { NextRequest } from 'next/server';

// /api/internal/run-daily-all processes every user, so it must require the cron secret rather
// than any user session, and fail closed when the secret is missing or weak.

const { POST } = await import('../../app/api/internal/run-daily-all/route.js');
const SECRET = 'cron-secret-for-tests-0123456789abcdef';

function call(authorization?: string): Promise<Response> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (authorization !== undefined) headers['authorization'] = authorization;
  return POST(
    new NextRequest('http://localhost/api/internal/run-daily-all', { method: 'POST', headers, body: '{}' })
  );
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

process.stdout.write('internal-run-daily-all-auth: ok\n');
