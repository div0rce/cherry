import * as fs from 'node:fs';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { fail } from './guardrails/lib/fail.mjs';
import { spawnTool } from './guardrails/lib/run-tool.mjs';
import {
  LOCK_NAME,
  LOG_NAME,
  acquireLock,
  cleanTree,
  gitPath,
  hasPassed,
  lockHolder,
  preflightProblems,
} from './lib/full-gate.mjs';
import { resolveRootArg } from './lib/root-arg.mjs';

ensureTsEsm();

// The local FULL gate: preflight, one run per worktree at a time, and no re-run of a committed tree
// that already passed on this Node version (--force re-runs it). It runs exactly `npm run ci:verify`.
const PREFIX = 'verify:full';
const root = resolveRootArg(process.argv);
const force = process.argv.includes('--force');

const problems = preflightProblems(root);
if (problems.length > 0) {
  fail(PREFIX, 'preflight failed; FULL not started', {
    details: problems,
    fix: 'Fix each item above, then rerun npm run verify:full.',
  });
}

async function runFull(): Promise<number> {
  const tree = cleanTree(root);
  const key = tree === null ? null : `${tree} ${process.version}`;
  const logFile = gitPath(root, LOG_NAME);
  if (key !== null && !force && hasPassed(logFile, key)) {
    process.stdout.write(`${PREFIX}: tree ${key} already passed; not re-running (--force to re-run)\n`);
    return 0;
  }

  const lockFile = gitPath(root, LOCK_NAME);
  if (!acquireLock(lockFile)) {
    fail(PREFIX, `another FULL run (pid ${String(lockHolder(lockFile))}) holds ${lockFile}`, {
      fix: 'Wait for it to finish. If no such process exists, delete the lock file.',
    });
  }

  let exitCode = 1;
  try {
    const child = spawnTool('npm', ['run', 'ci:verify'], { cwd: root, stdio: 'inherit' });
    exitCode = await new Promise<number>((resolve) => {
      child.on('error', () => resolve(127));
      child.on('close', (status: number | null) => resolve(status ?? 1));
    });
  } finally {
    fs.rmSync(lockFile, { force: true });
  }

  // A file edited during the run means the starting tree was not what got verified.
  const recorded = key !== null && cleanTree(root) === tree;
  if (recorded) {
    fs.appendFileSync(logFile, `${key} ${exitCode === 0 ? 'pass' : 'fail'}\n`);
  }
  const state = recorded ? `tree ${key}` : 'working tree changed or dirty; result not recorded';
  process.stdout.write(`${PREFIX}: ${exitCode === 0 ? 'pass' : 'FAIL'} (${state})\n`);
  return exitCode;
}

process.exitCode = await runFull();
