import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const repoRoot = process.cwd();
const scriptPath = path.join(repoRoot, 'scripts', 'check-repo-guardrails.js');
const fixturesRoot = path.join(repoRoot, 'tests', 'fixtures', 'guardrails', 'repo');

type Expectation = {
  guardrail: string;
  token: string;
  file: string;
};

function runFixture(subdir: string, expectation: Expectation): void {
  const root = path.join(fixturesRoot, subdir);
  const result = spawnSync('node', [scriptPath, '--root', root], {
    encoding: 'utf8',
  });

  assert.notEqual(result.status, 0, 'expected guardrail to fail');
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  assert.ok(output.includes(expectation.guardrail), 'missing guardrail name');
  assert.ok(output.includes(expectation.token), 'missing matched token');
  assert.ok(output.includes(path.normalize(expectation.file)), 'missing file path');
}

function run(): void {
  runFixture('randomness', {
    guardrail: 'no-implicit-randomness',
    token: 'Math.random',
    file: path.join('lib', 'fixture-randomness.ts'),
  });

  runFixture('engine-prisma', {
    guardrail: 'engine-prisma-leak',
    token: '@prisma/client',
    file: path.join('lib', 'engine', 'fixture-engine-prisma.ts'),
  });

  runFixture('date', {
    guardrail: 'no-implicit-time',
    token: 'new Date(',
    file: path.join('lib', 'engine', 'fixture-date.ts'),
  });

  runFixture('user-fetch-boundary', {
    guardrail: 'user-fetch-boundary',
    token: 'app/(user)/_lib/api',
    file: path.join('app', 'marketing', 'page.tsx'),
  });

  runFixture('no-user-imports-lib', {
    guardrail: 'no-user-imports',
    token: 'app/(user)',
    file: path.join('lib', 'fixture-user-import.ts'),
  });

  runFixture('no-user-imports-api', {
    guardrail: 'no-user-imports',
    token: 'app/(user)',
    file: path.join('app', 'api', 'fixture', 'route.ts'),
  });

  runFixture('no-user-imports-scripts', {
    guardrail: 'no-user-imports',
    token: 'app/(user)',
    file: path.join('scripts', 'fixture-user-import.ts'),
  });

  runFixture('user-context-boundary', {
    guardrail: 'user-context-boundary',
    token: 'resolveUserContext',
    file: path.join('app', '(user)', 'fixture', 'page.tsx'),
  });

  runFixture('deprecated-user-api', {
    guardrail: 'deprecated-user-api',
    token: 'app/(user)/_lib/actions',
    file: path.join('app', 'marketing', 'page.tsx'),
  });

  runFixture('raw-error-logging', {
    guardrail: 'raw-error-logging',
    token: 'err',
    file: path.join('lib', 'fixture-log-error.ts'),
  });

  runFixture('duplicate-module', {
    guardrail: 'types-duplicate-module',
    token: 'dup/module',
    file: path.join('types', 'compat', 'dup-a.d.ts'),
  });

  runFixture('rogue-types', {
    guardrail: 'types-compat-only',
    token: 'types/rogue.d.ts',
    file: path.join('types', 'rogue.d.ts'),
  });

  runFixture('tsconfig-json-parse', {
    guardrail: 'tsconfig-parse-violation',
    token: 'JSON.parse',
    file: path.join('scripts', 'bad.ts'),
  });

  runFixture('esm-loader-missing', {
    guardrail: 'esm-loader-missing',
    token: 'ts-node .mts without --loader ts-node/esm',
    file: 'package.json',
  });

  runFixture('esm-loader-inline', {
    guardrail: 'esm-loader-inline',
    token: 'check:side-effects',
    file: 'package.json',
  });

  console.warn('repo-guardrails: ok');
}

run();
