import * as assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..', '..', '..');
const fixtureRoot = path.join(repoRoot, 'tests', 'fixtures', 'guardrails', 'repo', 'domain-boundaries');

const result = spawnSync('npm', ['run', 'check:domain-boundaries', '--', '--root', fixtureRoot], {
  cwd: repoRoot,
  encoding: 'utf8',
});

const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
assert.notEqual(result.status, 0, `expected guardrail to fail for fixture, got status=${result.status ?? 'null'}`);
assert.equal(output.includes("domain 'a' may not import 'b'"), true, `expected value-import violation, got: ${output}`);
assert.equal(output.includes('lib/a/x.ts -> lib/b/y.ts'), true, 'expected file-level edge in output');

process.stdout.write('domain-boundaries: ok\n');
