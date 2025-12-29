import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const repoRoot = process.cwd();
const guardrailArgs = ['run', 'ts:esm', '--', 'scripts/check-repo-guardrails.mts'];
const fixturesRoot = path.join(repoRoot, 'tests', 'fixtures', 'guardrails', 'money');

function runFixture(
  fixtureName: string,
  options: { expectFail: boolean; token?: string }
): void {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cherry-money-'));
  try {
    const libDir = path.join(tempRoot, 'lib');
    fs.mkdirSync(libDir, { recursive: true });
    const sourcePath = path.join(fixturesRoot, fixtureName);
    const destPath = path.join(libDir, fixtureName);
    fs.copyFileSync(sourcePath, destPath);

    const result = spawnSync('npm', [...guardrailArgs, '--root', tempRoot], {
      encoding: 'utf8',
      cwd: repoRoot,
    });
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;

    if (options.expectFail) {
      assert.notEqual(result.status, 0, 'expected money guardrail to fail');
      assert.ok(output.includes('money-float-banned'), 'missing guardrail name');
      if (typeof options.token === 'string' && options.token.length > 0) {
        assert.ok(output.includes(options.token), 'missing matched token');
      }
      assert.ok(output.includes(path.normalize(path.join('lib', fixtureName))), 'missing file path');
    } else {
      const message = output.trim();
      const fallback = message.length > 0 ? message : 'expected money guardrail to pass';
      assert.equal(result.status, 0, fallback);
      assert.ok(output.includes('check-repo-guardrails: ok'), 'missing success marker');
    }
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function run(): void {
  runFixture('float.bad.ts', { expectFail: true, token: '* 100' });
  runFixture('int.ok.ts', { expectFail: false });
  console.warn('money-float-banned: ok');
}

run();
