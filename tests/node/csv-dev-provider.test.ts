import * as assert from 'node:assert/strict';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsvDevFile } from '../../lib/bank/csv-dev-provider.js';

// Pins csv-parse behavior (columns, trimming, empty lines) across major upgrades, using the
// synthetic statement the dev bank provider reads.
const __filename = fileURLToPath(import.meta.url);
const csv = path.resolve(path.dirname(__filename), '..', '..', 'data', 'bank', 'moustafa-adv-safebalance-2061.csv');

const rows = await parseCsvDevFile(csv);
assert.ok(rows.length > 0, 'synthetic statement parsed to zero rows');
const first = rows[0];
assert.ok(first !== undefined);
assert.equal(first.postedDate.toISOString().slice(0, 10), '2024-01-01');
assert.equal(first.amountMinor, 280000);
assert.equal(first.direction, 'credit');
assert.match(first.description, /SYNTHETIC PAYROLL/);
assert.ok(rows.every((row) => Number.isInteger(row.amountMinor)), 'amounts stay integer cents');
process.stdout.write(`csv-dev-provider: ok (${rows.length} rows)\n`);
