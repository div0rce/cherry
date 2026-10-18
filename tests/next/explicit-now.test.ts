import * as assert from 'node:assert/strict';
import { resolveExplicitNow } from '../../app/(user)/_lib/clock.js';
import { resolveNow } from '../../app/api/_clock.js';

// Server actions receive `now` as a form string of epoch ms; bucket create/edit failed because
// new Date('1792284962908') is Invalid Date.
const ms = 1792284962908;
for (const resolve of [resolveExplicitNow, (raw: unknown) => resolveNow(raw)]) {
  assert.equal(resolve(String(ms)).getTime(), ms);
  assert.equal(resolve(ms).getTime(), ms);
  assert.equal(resolve('2026-10-17T00:00:00.000Z').toISOString(), '2026-10-17T00:00:00.000Z');
  assert.throws(() => resolve(''));
  assert.throws(() => resolve(null));
  assert.throws(() => resolve('not a date'));
}
process.stdout.write('explicit-now: ok\n');
