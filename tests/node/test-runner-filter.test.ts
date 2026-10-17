import * as assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

// --filter on check:tests:node splits on commas outside braces, so a brace glob stays one glob.
const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..', '..');

const result = spawnSync(
  'npm',
  ['run', 'check:tests:node', '--', '--filter=tests/node/{idempotency.test.ts,identity-determinism.test.ts}'],
  { cwd: repoRoot, encoding: 'utf8' }
);
const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
assert.equal(result.status, 0, output);
assert.match(output, /FILTERED RUN \(2\/\d+ files\)/, output);
assert.match(output, /RUN tests\/node\/idempotency\.test\.ts/, output);
assert.match(output, /RUN tests\/node\/identity-determinism\.test\.ts/, output);

process.stdout.write('test-runner-filter: ok\n');
