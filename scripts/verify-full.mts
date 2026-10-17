import * as fs from 'node:fs';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { fail } from './guardrails/lib/fail.mjs';
import { spawnTool } from './guardrails/lib/run-tool.mjs';
import {
  LOCK_NAME,
  LOG_NAME,
  acquireLock,
  gateKey,
  gitPath,
  hasPassed,
  preflightProblems,
  readLock,
} from './lib/full-gate.mjs';
import { resolveRootArg } from './lib/root-arg.mjs';

ensureTsEsm();

// The local FULL gate: preflight, one run per worktree at a time, and no re-run of a clean commit that
// already passed against the same main refs on this Node version (--force re-runs it). It runs exactly
// `npm run ci:verify`.
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

const SIGNALS = ['SIGINT', 'SIGTERM', 'SIGHUP'] as const;

async function runFull(): Promise<number> {
  const key = gateKey(root);
  const logFile = gitPath(root, LOG_NAME);
  if (key !== null && !force && hasPassed(logFile, key)) {
    process.stdout.write(`${PREFIX}: ${key} already passed; not re-running (--force to re-run)\n`);
    return 0;
  }

  const lockFile = gitPath(root, LOCK_NAME);
  if (!acquireLock(lockFile)) {
    fail(PREFIX, `another FULL run (pid ${String(readLock(lockFile)?.pid)}) holds ${lockFile}`, {
      fix: 'Wait for it to finish (npm run verify:preflight says whether it is still running).',
    });
  }

  let exitCode = 1;
  try {
    // Own process group, so a signal sent only to this wrapper (job managers send SIGTERM to the pid
    // they started) still reaches every check, test, and build process. The lock is released only
    // after that whole group has exited.
    const child = spawnTool('npm', ['run', 'ci:verify'], {
      cwd: root,
      stdio: ['ignore', 'inherit', 'inherit'],
      detached: true,
    });
    const forward = (signal: NodeJS.Signals): void => {
      if (child.pid !== undefined) process.kill(-child.pid, signal);
    };
    for (const signal of SIGNALS) process.on(signal, forward);
    exitCode = await new Promise<number>((resolve) => {
      child.on('error', () => resolve(127));
      child.on('close', (status: number | null) => resolve(status ?? 1));
    });
    for (const signal of SIGNALS) process.off(signal, forward);
  } finally {
    fs.rmSync(lockFile, { force: true });
  }

  // A file edited or a ref moved during the run means the starting state was not what got verified.
  const recorded = key !== null && gateKey(root) === key;
  if (recorded) {
    fs.appendFileSync(logFile, `${key} ${exitCode === 0 ? 'pass' : 'fail'}\n`);
  }
  const state = recorded ? key : 'working tree or refs changed, or tree dirty; result not recorded';
  process.stdout.write(`${PREFIX}: ${exitCode === 0 ? 'pass' : 'FAIL'} (${state})\n`);
  return exitCode;
}

process.exitCode = await runFull();
