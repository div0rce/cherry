import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

function run(): void {
  const repoRoot = process.cwd();
  const scriptPath = path.join(repoRoot, 'scripts', 'check-repo-guardrails.js');
  const result = spawnSync('node', [scriptPath], { encoding: 'utf8' });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;

  assert.equal(result.status, 0, output.trim() || 'expected repo guardrail to pass');
  assert.ok(output.includes('check-repo-guardrails: ok'), 'missing success marker');
  console.warn('repo-guardrails-smoke: ok');
}

run();
