import * as assert from 'node:assert/strict';
import { clampInt } from '../../lib/sessions/summaries.js';

// /api/sessions used to turn a missing ?limit= into 0 (Number(null)) and return no sessions.
assert.equal(clampInt(undefined, 1, 100, 20), 20);
assert.equal(clampInt(Number.NaN, 1, 100, 20), 20);
assert.equal(clampInt(0, 1, 100, 20), 1);
assert.equal(clampInt(-5, 1, 100, 20), 1);
assert.equal(clampInt(500, 1, 100, 20), 100);
assert.equal(clampInt(7.9, 1, 100, 20), 7);
assert.equal(clampInt(-3, 0, Number.MAX_SAFE_INTEGER, 0), 0);
process.stdout.write('session-list-clamp: ok\n');
