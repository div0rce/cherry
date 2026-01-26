import * as assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const repoRoot = process.cwd();
const scriptPath = path.join(repoRoot, 'scripts', 'check-user-pages-runtime.mts');
const tsxBin = path.join(
  repoRoot,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'tsx.cmd' : 'tsx'
);
const fixturesRoot = path.join(repoRoot, 'tests', 'fixtures', 'guardrails', 'user-pages');

function writeFixture(root: string, name: string, content: string): string {
  const pagePath = path.join(root, 'app', '(user)', name, 'page.tsx');
  fs.mkdirSync(path.dirname(pagePath), { recursive: true });
  fs.writeFileSync(pagePath, content, 'utf8');
  return pagePath;
}

function runGuardrail(root: string) {
  return spawnSync(
    tsxBin,
    ['--tsconfig', 'tsconfig.scripts.json', scriptPath, '--root', root],
    {
      encoding: 'utf8',
      cwd: repoRoot,
      env: { ...process.env, CHERRY_TSESM: '1' },
    }
  );
}

function loadFixture(filename: string): string {
  return fs.readFileSync(path.join(fixturesRoot, filename), 'utf8');
}

function run(): void {
  const missingDynamicContent = loadFixture('missing-dynamic.page.tsx');
  const dynamicOkContent = loadFixture('dynamic-ok.page.tsx');
  const dynamicForbiddenContent = loadFixture('dynamic-forbidden.page.tsx');

  const missingRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cherry-user-pages-missing-'));
  try {
    const pagePath = writeFixture(missingRoot, 'missing-dynamic', missingDynamicContent);
    const result = runGuardrail(missingRoot);
    assert.notEqual(result.status, 0, 'expected guardrail to fail');
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
    assert.ok(output.includes('user-pages-runtime'), 'missing guardrail name');
    assert.ok(output.includes('missing force-dynamic'), 'missing dynamic error');
    assert.ok(
      output.includes(path.normalize(path.relative(missingRoot, pagePath))),
      'missing file path'
    );
  } finally {
    fs.rmSync(missingRoot, { recursive: true, force: true });
  }

  const okRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cherry-user-pages-ok-'));
  try {
    writeFixture(okRoot, 'dynamic-ok', dynamicOkContent);
    const result = runGuardrail(okRoot);
    assert.equal(result.status, 0, 'expected guardrail to pass');
  } finally {
    fs.rmSync(okRoot, { recursive: true, force: true });
  }

  const forbiddenRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cherry-user-pages-forbidden-'));
  try {
    const pagePath = writeFixture(forbiddenRoot, 'dynamic-forbidden', dynamicForbiddenContent);
    const result = runGuardrail(forbiddenRoot);
    assert.notEqual(result.status, 0, 'expected guardrail to fail');
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
    assert.ok(output.includes('user-pages-runtime'), 'missing guardrail name');
    assert.ok(output.includes('getServerConfig'), 'missing matched token');
    assert.ok(
      output.includes(path.normalize(path.relative(forbiddenRoot, pagePath))),
      'missing file path'
    );
  } finally {
    fs.rmSync(forbiddenRoot, { recursive: true, force: true });
  }

  console.warn('user-pages-runtime: ok');
}

run();
