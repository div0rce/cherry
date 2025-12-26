import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const repoRoot = process.cwd();
const scriptPath = path.join(repoRoot, 'scripts', 'check-repo-guardrails.js');
const fixturesRoot = path.join(repoRoot, 'tests', 'fixtures', 'guardrails', 'migrations');

function runFixture(
  fixtureName: string,
  options: { expectFail: boolean; migration?: string }
): void {
  const root = path.join(fixturesRoot, fixtureName);
  const result = spawnSync('node', [scriptPath, '--root', root], { encoding: 'utf8' });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;

  if (options.expectFail) {
    assert.notEqual(result.status, 0, 'expected migration safety guardrail to fail');
    assert.ok(output.includes('migration-safety-missing-test'), 'missing guardrail name');
    if (typeof options.migration === 'string' && options.migration.length > 0) {
      assert.ok(output.includes(options.migration), 'missing migration name');
    }
  } else {
    const message = output.trim();
    const fallback = message.length > 0 ? message : 'expected migration safety guardrail to pass';
    assert.equal(result.status, 0, fallback);
    assert.ok(output.includes('check-repo-guardrails: ok'), 'missing success marker');
  }
}

function run(): void {
  runFixture('unsafe-migration', {
    expectFail: true,
    migration: '20250101000000_unsafe',
  });
  runFixture('safe-migration-with-test', { expectFail: false });
  runFixture('safe-migration-with-justification', { expectFail: false });
  console.warn('migration-safety: ok');
}

run();
