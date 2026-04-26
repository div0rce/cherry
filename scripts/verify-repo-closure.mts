import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildServerConfig } from '../lib/config/from-env.js';
import { fail } from './guardrails/lib/fail.mjs';
import { runTool } from './guardrails/lib/run-tool.mjs';
import { TMP_BUCKETS } from './lib/tmp/allocate.mjs';

const ROOT = process.cwd();
const VINE_ENV_KEY = 'CHERRY_VINE_SIGNATURE_MODE';
const VINE_ENV_VALUE = 'enforce';
const MAX_BUFFER = 96 * 1024 * 1024;

type Command = {
  name: string;
  tool: string;
  args: string[];
};

function printLocalReproduction(): void {
  const defaultTmp = path.join(os.homedir(), '.cherry-tmp');
  process.stderr.write(
    [
      'Local reproduction exports:',
      `export CHERRY_TMP_ROOT="${process.env['CHERRY_TMP_ROOT'] ?? defaultTmp}"`,
      'mkdir -p "$CHERRY_TMP_ROOT"',
      'chmod 700 "$CHERRY_TMP_ROOT"',
      `export ${VINE_ENV_KEY}=${VINE_ENV_VALUE}`,
      '',
    ].join('\n')
  );
}

function abort(message: string): never {
  process.stderr.write(`verify:repo-closure failed: ${message}\n`);
  printLocalReproduction();
  fail('verify:repo-closure', message, {
    fix: 'Set the printed environment exports and rerun npm run verify:repo-closure.',
  });
}

function assertCherryTmpRoot(): void {
  const raw = process.env['CHERRY_TMP_ROOT'];
  if (raw === undefined || raw.trim() === '') {
    abort('CHERRY_TMP_ROOT is required.');
  }

  const tmpRoot = path.resolve(raw);
  let stats: fs.Stats;
  try {
    stats = fs.statSync(tmpRoot);
  } catch (_error: unknown) {
    void _error;
    abort(`CHERRY_TMP_ROOT does not exist: ${tmpRoot}`);
  }
  if (!stats.isDirectory()) {
    abort(`CHERRY_TMP_ROOT must be a directory: ${tmpRoot}`);
  }
  try {
    fs.accessSync(tmpRoot, fs.constants.W_OK);
  } catch (_error: unknown) {
    void _error;
    abort(`CHERRY_TMP_ROOT must be writable: ${tmpRoot}`);
  }

  const entries = fs.readdirSync(tmpRoot, { withFileTypes: true });
  let safelyIsolated = false;
  if (entries.length > 0) {
    const realTmpRoot = fs.realpathSync(tmpRoot);
    const realSystemTmp = fs.realpathSync(os.tmpdir());
    const basename = path.basename(realTmpRoot).toLowerCase();
    const systemTempIsolated =
      realTmpRoot.startsWith(`${realSystemTmp}${path.sep}`) && basename.includes('cherry');
    const allowedBuckets = new Set<string>(TMP_BUCKETS);
    const repoTempBucketShape = entries.every(
      (entry) => entry.isDirectory() && allowedBuckets.has(entry.name)
    );
    safelyIsolated = systemTempIsolated || repoTempBucketShape;
  }
  if (entries.length > 0 && safelyIsolated !== true) {
    abort(
      `CHERRY_TMP_ROOT must be empty unless it is a dedicated Cherry directory under the system temp root or contains only ${TMP_BUCKETS.join(', ')} buckets.`
    );
  }
}

function productionEnvWithVineMode(value: string | undefined): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: 'production',
  };
  if (value === undefined) {
    delete env[VINE_ENV_KEY];
  } else {
    env[VINE_ENV_KEY] = value;
  }
  return env;
}

function assertProductionVineModeAccepted(value: string): void {
  let parsed: ReturnType<typeof buildServerConfig>;
  try {
    parsed = buildServerConfig(productionEnvWithVineMode(value));
  } catch (error: unknown) {
    abort(
      `Production Vine config rejected ${VINE_ENV_KEY}=${value}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
  if (parsed.vineSignatureMode !== VINE_ENV_VALUE) {
    abort(`Parsed Vine signature mode is ${parsed.vineSignatureMode}, expected ${VINE_ENV_VALUE}.`);
  }
}

function assertProductionVineModeRejected(value: string | undefined, label: string): void {
  try {
    buildServerConfig(productionEnvWithVineMode(value));
  } catch (_error: unknown) {
    void _error;
    return;
  }
  abort(`Production Vine config unexpectedly accepted ${label}.`);
}

function assertVineEnvContractFromCode(): void {
  assertProductionVineModeAccepted(VINE_ENV_VALUE);
  assertProductionVineModeRejected(undefined, `missing ${VINE_ENV_KEY}`);
  assertProductionVineModeRejected('', `empty ${VINE_ENV_KEY}`);
  assertProductionVineModeRejected('warn', `${VINE_ENV_KEY}=warn`);

  if (process.env[VINE_ENV_KEY] !== VINE_ENV_VALUE) {
    abort(`${VINE_ENV_KEY} must be exactly ${VINE_ENV_VALUE}; no defaults or fallbacks are allowed.`);
  }
}

function runCommand(command: Command): void {
  process.stdout.write(`\n> ${command.name}\n`);
  const result = runTool(command.tool, command.args, {
    cwd: ROOT,
    env: process.env,
    maxBuffer: MAX_BUFFER,
  });
  if (result.stdout.length > 0) process.stdout.write(result.stdout);
  if (result.stderr.length > 0) process.stderr.write(result.stderr);
  if (result.exitCode !== 0) {
    abort(`${command.name} exited with ${result.exitCode}.`);
  }
}

const tsEsmTestPrefix = [
  'run',
  'ts:esm',
  '--',
  '--import',
  './scripts/lib/loaders/config.loader.mjs',
  '--import',
  './scripts/lib/loaders/prisma-mock.register.mjs',
  '-r',
  'tsconfig-paths/register',
];

const proofTests = [
  'tests/node/engine-scheduled-paydowns-temporal.test.ts',
  'tests/node/engine-scheduled-paydowns-source.test.ts',
  'tests/node/engine-solver-scheduled-paydowns.test.ts',
  'tests/next/api-scan.temporal-context.test.ts',
  'tests/next/api-simulate.temporal-context.test.ts',
  'tests/next/api-sessions.temporal-context.test.ts',
  'tests/node/runtime-scheduled-paydowns-availability.test.ts',
  'tests/node/recommendation-temporal-schema.test.ts',
  'tests/node/docs-engine-time-semantics.test.ts',
];

const commands: Command[] = [
  ...proofTests.map((testPath) => ({
    name: `issue-8 proof: ${testPath}`,
    tool: 'npm',
    args: [...tsEsmTestPrefix, testPath],
  })),
  { name: 'npm run lint', tool: 'npm', args: ['run', 'lint'] },
  { name: 'npm run check', tool: 'npm', args: ['run', 'check'] },
  { name: 'npm run typecheck', tool: 'npm', args: ['run', 'typecheck'] },
  { name: 'npm test', tool: 'npm', args: ['test'] },
  { name: 'npm run build', tool: 'npm', args: ['run', 'build'] },
];

assertCherryTmpRoot();
assertVineEnvContractFromCode();
process.stdout.write('verify:repo-closure env contract: ok\n');

for (const command of commands) {
  runCommand(command);
}

process.stdout.write('\nverify:repo-closure: ok\n');
