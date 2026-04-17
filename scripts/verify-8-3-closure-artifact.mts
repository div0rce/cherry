import * as fs from 'node:fs';
import * as path from 'node:path';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { buildDeterministicEnv } from './lib/deterministic-env.mjs';
import { fail } from './guardrails/lib/fail.mjs';
import { runTool } from './guardrails/lib/run-tool.mjs';
import { GENERIC_ARTIFACT_PREFIX, withAppliedHeadWorktree, verifyCherryDiffArtifact } from './lib/cherry-diff-artifact.mjs';

ensureTsEsm();

const PREFIX = 'verify:8.3-closure-artifact';
const ROOT = process.cwd();
const NODE_ARGS = [
  '--import',
  './scripts/lib/loaders/config.loader.mjs',
  '--import',
  './scripts/lib/loaders/prisma-mock.register.mjs',
  '-r',
  'tsconfig-paths/register',
] as const;
const CLOSURE_SUITE = [
  'tests/credit-liability-naming-closeout.test.js',
  'tests/node/credit-liability-naming-closeout.test.js',
  'tests/scan-client-state.test.js',
  'tests/node/scan-client-state.test.js',
  'tests/simulate-response-schema.test.js',
  'tests/node/simulate-response-schema.test.js',
  'tests/engine-solver.test.js',
  'tests/node/engine-solver.test.js',
  'tests/engine-state.prisma.test.js',
  'tests/node/engine-state.prisma.test.js',
  'tests/api-scan.runtime-degradation.test.js',
  'tests/node/api-scan.runtime-degradation.test.js',
  'tests/api-autopilot-preview.runtime-degradation.test.js',
  'tests/node/api-autopilot-preview.runtime-degradation.test.js',
  'tests/api-simulate.runtime-degradation.test.js',
  'tests/node/api-simulate.runtime-degradation.test.js',
  'tests/run-recommendation.user-context.test.js',
  'tests/node/run-recommendation.user-context.test.js',
  'tests/api-scan.user-context.test.js',
  'tests/api-sessions.user-context.test.js',
  'tests/api-simulate.user-context.test.js',
  'tests/next/api-scan.user-context.test.js',
  'tests/next/api-sessions.user-context.test.js',
  'tests/next/api-simulate.user-context.test.js',
] as const;

function assertOk(
  step: string,
  result: ReturnType<typeof runTool>,
  fix: string
): void {
  if (result.exitCode === 0) return;
  const details = [`step=${step}`, `exit=${result.exitCode}`];
  if (result.stdout.trim().length > 0) {
    details.push(`stdout=${result.stdout.trim()}`);
  }
  if (result.stderr.trim().length > 0) {
    details.push(`stderr=${result.stderr.trim()}`);
  }
  fail(PREFIX, `Failed during ${step}.`, { details, fix });
}

function runClosureSuite(cwd: string, label: string): void {
  const env: NodeJS.ProcessEnv = {
    ...buildDeterministicEnv(),
    ...process.env,
    NODE_ENV: 'test',
  };

  for (const testFile of CLOSURE_SUITE) {
    const absoluteFile = path.join(cwd, testFile);
    if (!fs.existsSync(absoluteFile)) {
      fail(PREFIX, `Missing closure-suite file in ${label}.`, {
        details: [testFile],
        fix: 'Restore the expected 8.3 closure-suite files before verifying the artifact.',
      });
    }

    const result = runTool(
      'npm',
      ['run', 'ts:esm', '--', ...NODE_ARGS, testFile],
      {
        cwd,
        env,
      }
    );
    assertOk(`${label}:${testFile}`, result, 'Fix the failing closure-suite test and rerun verification.');
  }
}

function main(): void {
  runClosureSuite(ROOT, 'working-tree');
  verifyCherryDiffArtifact(GENERIC_ARTIFACT_PREFIX);
  withAppliedHeadWorktree(GENERIC_ARTIFACT_PREFIX, (worktreePath) => {
    runClosureSuite(worktreePath, 'clean-applied-tree');
  });
  process.stdout.write('verify:8.3-closure-artifact: ok\n');
}

main();
