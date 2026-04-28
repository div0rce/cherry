import * as path from 'node:path';
import * as process from 'node:process';
import { fileURLToPath } from 'node:url';
import { buildDeterministicEnv } from './lib/deterministic-env.mjs';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { asMessage } from './guardrails/lib/error.mjs';
import { fail } from './guardrails/lib/fail.mjs';
import { spawnTool } from './guardrails/lib/run-tool.mjs';
import { runTsEsm } from './lib/run-ts-esm.mjs';
import {
  EXCLUDED,
  ROOT_GLOBS,
  resolveFiles,
  resolveUnexpectedRootFiles,
} from './lib/test-runner-scope.mjs';

ensureTsEsm();

const PREFIX = 'check:run-tests';
const FIX = 'Run tests via npm run check:run-tests after installing dependencies.';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..');

const tsNodeCompilerOptions = JSON.stringify({
  module: 'CommonJS',
  moduleResolution: 'node',
  baseUrl: '.',
  paths: { '@/*': ['./*'] },
  allowJs: true,
  jsx: 'react-jsx',
});

async function runLane(scriptName: 'check:run-tests:node' | 'check:run-tests:next'): Promise<void> {
  let errorMessage: string | null = null;
  const child = spawnTool('npm', ['run', scriptName], {
    cwd: repoRoot,
    env: process.env,
    stdio: 'inherit',
  });

  const exitCode = await new Promise<number>((resolve) => {
    child.on('error', (error: unknown) => {
      errorMessage = asMessage(error);
      resolve(127);
    });
    child.on('close', (code) => {
      resolve(code ?? 1);
    });
  });

  if (exitCode !== 0) {
    const details = [`exit=${exitCode}`];
    if (errorMessage !== null) {
      details.push(`error=${errorMessage}`);
    }
    fail(PREFIX, `${scriptName} failed`, {
      details,
      fix: 'Fix the failing test lane and rerun.',
    });
  }
}

const baseEnv = buildDeterministicEnv();
const nodeEnv = baseEnv['NODE_ENV'] ?? 'test';
const runEnv: NodeJS.ProcessEnv = {
  ...baseEnv,
  NODE_ENV: nodeEnv,
  TS_NODE_PROJECT: path.join(repoRoot, 'tsconfig.eslint.json'),
  TS_NODE_COMPILER_OPTIONS: tsNodeCompilerOptions,
};

const testFiles = await resolveFiles(ROOT_GLOBS, EXCLUDED, repoRoot);

if (testFiles.length === 0) {
  fail(PREFIX, 'No tests found under tests/**/*.test.{js,ts,tsx}', { fix: FIX });
}

const unexpectedRootFiles = await resolveUnexpectedRootFiles(testFiles, repoRoot);
if (unexpectedRootFiles.length > 0) {
  fail(PREFIX, 'Root runner owns tests outside the explicit root allowlist', {
    details: unexpectedRootFiles,
    fix:
      'Move the tests into tests/node or tests/next, or explicitly add the root-owned path to ROOT_ALLOWED_GLOBS.',
  });
}

process.stdout.write(`TS_NODE_COMPILER_OPTIONS=${tsNodeCompilerOptions}\n`);

for (const file of testFiles) {
  process.stdout.write(`RUN ${file}\n`);
  const result = runTsEsm(
    file,
    [
      '--import',
      './scripts/lib/loaders/config.loader.mjs',
      '--import',
      './scripts/lib/loaders/prisma-mock.register.mjs',
      '-r',
      'tsconfig-paths/register',
    ],
    runEnv
  );

  if (result.stdout.length > 0) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr.length > 0) {
    process.stderr.write(result.stderr);
  }

  if (result.exitCode !== 0) {
    const details = [`exit=${result.exitCode}`];
    if (result.stdout.trim().length > 0) {
      details.push(`stdout=${result.stdout.trim()}`);
    }
    if (result.stderr.trim().length > 0) {
      details.push(`stderr=${result.stderr.trim()}`);
    }
    fail(PREFIX, `FAILED ${file}`, { details, fix: 'Fix the failing test(s) and rerun.' });
  }
}

await runLane('check:run-tests:node');
await runLane('check:run-tests:next');
