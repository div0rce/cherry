import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const repoRoot = process.cwd();
const scriptPath = path.join(repoRoot, 'scripts', 'check-repo-guardrails.js');
const fixturesRoot = path.join(repoRoot, 'tests', 'fixtures', 'guardrails', 'engine-purity');

function runFixture(
  fixtureName: string,
  options: { expectFail: boolean; token?: string }
): void {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cherry-engine-purity-'));
  try {
    const engineDir = path.join(tempRoot, 'lib', 'engine');
    fs.mkdirSync(engineDir, { recursive: true });
    const sourcePath = path.join(fixturesRoot, fixtureName);
    const destPath = path.join(engineDir, fixtureName);
    fs.copyFileSync(sourcePath, destPath);

    const result = spawnSync('node', [scriptPath, '--root', tempRoot], { encoding: 'utf8' });
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;

    if (options.expectFail) {
      assert.notEqual(result.status, 0, 'expected engine purity guardrail to fail');
      assert.ok(output.includes('engine-side-effect-banned'), 'missing guardrail name');
      if (typeof options.token === 'string' && options.token.length > 0) {
        assert.ok(output.includes(options.token), 'missing matched token');
      }
      assert.ok(
        output.includes(path.normalize(path.join('lib', 'engine', fixtureName))),
        'missing file path'
      );
    } else {
      const message = output.trim();
      const fallback = message.length > 0 ? message : 'expected engine purity guardrail to pass';
      assert.equal(result.status, 0, fallback);
      assert.ok(output.includes('check-repo-guardrails: ok'), 'missing success marker');
    }
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function run(): void {
  runFixture('console.bad.ts', { expectFail: true, token: 'console.' });
  runFixture('fetch.bad.ts', { expectFail: true, token: 'fetch(' });
  runFixture('pure.ok.ts', { expectFail: false });
  console.warn('engine-purity: ok');
}

run();
