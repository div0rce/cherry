import * as fs from 'node:fs';
import * as path from 'node:path';
import { z } from 'zod';
import { fail } from '../guardrails/lib/fail.mjs';
import { readJsonFile } from '../guardrails/lib/read-json.mjs';
import { runTool } from '../guardrails/lib/run-tool.mjs';

// Shared by verify:preflight and verify:full. Local workflow only: CI runs ci:verify directly and
// never reads the lock or the log.

// ponytail: 1 GiB is about 4x a from-scratch .next (258 MB, measured 2026-10-17), the largest write
// FULL makes in an installed checkout; npm ci on an unchanged lockfile replaces node_modules (828 MB)
// at about net zero. ENOSPC hit near 330 MB free. A fresh worktree needs ~1.1 GB more, but preflight
// needs installed deps, so check `df -h .` by hand there. Raise it if these outputs grow.
export const MIN_FREE_BYTES = 1024 ** 3;
export const LOCK_NAME = 'cherry-full-gate.lock';
export const LOG_NAME = 'cherry-full-gate.log';

const GIT_IN_PROGRESS = ['index.lock', 'rebase-merge', 'rebase-apply', 'MERGE_HEAD', 'CHERRY_PICK_HEAD'];
const PackageManagerSchema = z.object({ packageManager: z.string() }).passthrough();

function errorCode(error: unknown): unknown {
  return error instanceof Error && 'code' in error ? error.code : undefined;
}

// Per-worktree path inside the git dir, so worktrees never share a lock or a log.
export function gitPath(root: string, name: string): string {
  const result = runTool('git', ['rev-parse', '--git-path', name], { cwd: root });
  if (!result.ok) fail('full-gate', `git rev-parse --git-path ${name} failed in ${root}`, [result.stderr]);
  return path.resolve(root, result.stdout.trim());
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error: unknown) {
    return errorCode(error) === 'EPERM';
  }
}

// ponytail: pid liveness only; a reused pid makes a stale lock look held. The message prints the
// lock path so it can be deleted by hand.
export function lockHolder(lockFile: string): number | null {
  if (!fs.existsSync(lockFile)) return null;
  const pid = Number(fs.readFileSync(lockFile, 'utf8').trim());
  return Number.isInteger(pid) && pid > 0 && isAlive(pid) ? pid : null;
}

// Atomic create; a lock left by a dead process is reclaimed once.
export function acquireLock(lockFile: string): boolean {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      fs.writeFileSync(lockFile, `${process.pid}\n`, { flag: 'wx' });
      return true;
    } catch (error: unknown) {
      if (errorCode(error) !== 'EEXIST') throw error;
      if (lockHolder(lockFile) !== null) return false;
      fs.rmSync(lockFile, { force: true });
    }
  }
  return false;
}

// The committed tree when nothing is modified or untracked; null otherwise. Dirty runs are never
// recorded, so a recorded pass names exactly the source that was verified.
// ponytail: gitignored inputs (.env*, node_modules) are not in the key; pass --force after changing them.
export function cleanTree(root: string): string | null {
  const status = runTool('git', ['status', '--porcelain'], { cwd: root });
  if (!status.ok || status.stdout.trim().length > 0) return null;
  const tree = runTool('git', ['rev-parse', 'HEAD^{tree}'], { cwd: root });
  return tree.ok ? tree.stdout.trim() : null;
}

// Log lines are "<tree> <node version> pass|fail".
export function hasPassed(logFile: string, key: string): boolean {
  if (!fs.existsSync(logFile)) return false;
  return fs.readFileSync(logFile, 'utf8').split('\n').includes(`${key} pass`);
}

function toolVersion(root: string, tool: string): string | null {
  const result = runTool(tool, ['--version'], { cwd: root, allowMissingTool: true });
  return result.ok ? result.stdout.trim() : null;
}

// Everything that makes an expensive run (npm ci, build, FULL) fail late or collide with another one.
export function preflightProblems(root: string): string[] {
  const problems: string[] = [];

  const expectedNode = `v${fs.readFileSync(path.join(root, '.nvmrc'), 'utf8').trim()}`;
  if (process.version !== expectedNode) {
    problems.push(`node ${process.version}, expected ${expectedNode} (.nvmrc): run nvm use.`);
  }
  const pkg = PackageManagerSchema.parse(readJsonFile(path.join(root, 'package.json')));
  const expectedNpm = pkg.packageManager.replace(/^npm@/, '');
  const npm = toolVersion(root, 'npm');
  if (npm !== expectedNpm) {
    problems.push(`npm ${npm ?? 'missing'}, expected ${expectedNpm} (package.json packageManager).`);
  }
  for (const tool of ['git', 'rg']) {
    if (toolVersion(root, tool) === null) problems.push(`${tool} is not on PATH.`);
  }

  // CHERRY_TMP_ROOT is already validated (set, not OS temp, directory, mode 700) by the execution
  // runner before any registered script starts.
  if (process.env['CHERRY_VINE_SIGNATURE_MODE'] !== 'enforce') {
    problems.push('CHERRY_VINE_SIGNATURE_MODE must be enforce (the build asserts production config).');
  }

  const disk = fs.statfsSync(root);
  const free = disk.bavail * disk.bsize;
  if (free < MIN_FREE_BYTES) {
    const gib = (bytes: number): string => (bytes / 1024 ** 3).toFixed(1);
    problems.push(
      `${gib(free)} GiB free on ${root}, need ${gib(MIN_FREE_BYTES)} GiB. ` +
        'Disposable here: .next (rm -rf .next) and stale CHERRY_TMP_ROOT entries (npm run tmp:gc).'
    );
  }

  for (const name of GIT_IN_PROGRESS) {
    if (fs.existsSync(gitPath(root, name))) {
      problems.push(`git operation in progress in this worktree (${name}); finish or abort it first.`);
    }
  }
  const lockFile = gitPath(root, LOCK_NAME);
  const holder = lockHolder(lockFile);
  if (holder !== null) {
    problems.push(`a FULL run (pid ${holder}) already holds ${lockFile}; wait for it.`);
  }

  return problems;
}
