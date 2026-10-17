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

const GIT_IN_PROGRESS = [
  'index.lock',
  'rebase-merge',
  'rebase-apply',
  'MERGE_HEAD',
  'CHERRY_PICK_HEAD',
  'REVERT_HEAD',
  'BISECT_LOG',
];
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

export type LockState = { pid: number; alive: boolean } | null;

export function readLock(lockFile: string): LockState {
  if (!fs.existsSync(lockFile)) return null;
  const pid = Number(fs.readFileSync(lockFile, 'utf8').trim());
  return { pid, alive: Number.isInteger(pid) && pid > 0 && isAlive(pid) };
}

// Atomic create, never reclaimed automatically: two runs that both saw a dead holder could otherwise
// each delete the other's fresh lock. A stale lock is reported by preflight and removed by hand.
export function acquireLock(lockFile: string): boolean {
  try {
    fs.writeFileSync(lockFile, `${process.pid}\n`, { flag: 'wx' });
    return true;
  } catch (error: unknown) {
    if (errorCode(error) === 'EEXIST') return false;
    throw error;
  }
}

function commitOf(root: string, ref: string): string {
  const result = runTool('git', ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`], { cwd: root });
  return result.ok ? result.stdout.trim() : '-';
}

// What ci:verify reads from git: the working tree (must be clean, untracked files included whatever
// status.showUntrackedFiles says), HEAD's history (HEAD~1 diffs, commit messages), and merge-bases
// with origin/main and main. Null when the tree is dirty: dirty runs are never recorded.
// ponytail: gitignored inputs (.env*, node_modules) are not in the key; pass --force after changing them.
export function gateKey(root: string): string | null {
  const status = runTool('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: root });
  if (!status.ok || status.stdout.trim().length > 0) return null;
  const head = commitOf(root, 'HEAD');
  if (head === '-') return null;
  return `${head} ${commitOf(root, 'origin/main')} ${commitOf(root, 'main')} ${process.version}`;
}

// Log lines are "<HEAD> <origin/main> <main> <node> pass|fail"; the latest line for a key wins, so a
// failed --force run cancels an earlier pass.
export function hasPassed(logFile: string, key: string): boolean {
  if (!fs.existsSync(logFile)) return false;
  const latest = fs
    .readFileSync(logFile, 'utf8')
    .split('\n')
    .filter((line) => line.startsWith(`${key} `))
    .at(-1);
  return latest === `${key} pass`;
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
  const lock = readLock(lockFile);
  if (lock?.alive === true) {
    problems.push(`a FULL run (pid ${lock.pid}) already holds ${lockFile}; wait for it.`);
  } else if (lock !== null) {
    problems.push(
      `stale lock ${lockFile} from pid ${lock.pid}, which is not running. Confirm no ` +
        '`npm run ci:verify` is still running in this worktree, then delete the file.'
    );
  }

  return problems;
}
