import assert from 'node:assert/strict';
import { deriveStableId, assertStableId } from '../lib/identity/hash.js';

const payload = { userId: 'user-1', amountCents: 1234, meta: { category: 'DINING' } };

const id1 = deriveStableId('test', payload);
const id2 = deriveStableId('test', payload);

assert.equal(id1, id2, 'Stable IDs must be deterministic for identical inputs');
assertStableId(id1);

let threw = false;
try {
  assertStableId('123e4567-e89b-12d3-a456-426614174000');
} catch {
  threw = true;
}

assert.equal(threw, true, 'UUID-shaped IDs must be rejected');

process.stdout.write('identity-determinism: ok\n');
