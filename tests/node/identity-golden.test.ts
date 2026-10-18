import * as assert from 'node:assert/strict';
import { canonicalJson } from '../../lib/identity/canonical.js';
import { deriveStableId, assertStableId } from '../../lib/identity/hash.js';

// Golden values recorded from the pre-refactor implementation; persisted digests depend on them.
const payload = {
  z: 1,
  a: [true, null, 'x', new Date(0), { b: undefined, c: () => 1, a: -0.5 }],
  m: { y: 'é', B: 2, b: 3 },
};

assert.equal(canonicalJson(payload), '{"a":[true,null,"x","1970-01-01T00:00:00.000Z",{"a":-0.5}],"m":{"B":2,"b":3,"y":"é"},"z":1}');
assert.equal(deriveStableId('sess', payload), 'sess_da79e71c95c6fb5f3293fb21');
assert.equal(deriveStableId('ns', 'plain'), 'ns_945603a8f587786b463c3f94');
assert.equal(deriveStableId('ns', [1, 2]), 'ns_49a64717d5d4cb19952e6eac');
assert.throws(() => canonicalJson(undefined), /canonicalJson: unsupported value type/);

for (const bad of [undefined, null, 1, '']) {
  assert.throws(() => assertStableId(bad as unknown as string), /missing id/);
}
assert.throws(() => assertStableId('nope'), /invalid format/);
assert.throws(
  () => assertStableId('a-123e4567-e89b-12d3-a456-426614174000_0123456789abcdef01234567'),
  /UUIDs are forbidden/,
);
assertStableId(deriveStableId('sess', payload));

process.stdout.write('identity-golden: ok\n');
