import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

function run(): void {
  const repoRoot = process.cwd();
  const result = spawnSync('npm', ['run', 'ts:esm', '--', 'scripts/check-repo-guardrails.mts'], {
    encoding: 'utf8',
    cwd: repoRoot,
  });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;

  const message = output.trim();
  const fallback = message.length > 0 ? message : 'expected repo guardrail to pass';
  assert.equal(result.status, 0, fallback);
  assert.ok(output.includes('check-repo-guardrails: ok'), 'missing success marker');
  console.warn('repo-guardrails-smoke: ok');
}

run();
