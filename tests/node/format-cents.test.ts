import * as assert from 'node:assert/strict';
import { formatCents } from '../../lib/ui/money.js';

assert.equal(formatCents(0), '$0.00');
assert.equal(formatCents(5), '$0.05');
assert.equal(formatCents(1234), '$12.34');
assert.equal(formatCents(123456789), '$1,234,567.89');
assert.equal(formatCents(-2500), '-$25.00');
process.stdout.write('format-cents: ok\n');
