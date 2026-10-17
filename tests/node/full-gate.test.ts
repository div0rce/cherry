import * as assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LOCK_NAME,
  acquireLock,
  gateKey,
  gitPath,
  hasPassed,
  preflightProblems,
  readLock,
} from '../../scripts/lib/full-gate.mjs';

// verify:full's single-writer lock, verified-commit record, and preflight problems.

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..', '..');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cherry-full-gate-'));

function git(...args: string[]): string {
  const result = spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

// Lock: atomic, one holder at a time, and a dead holder's lock is never reclaimed automatically.
{
  git('init', '-q', '-b', 'work');
  const lockFile = gitPath(root, LOCK_NAME);
  assert.equal(acquireLock(lockFile), true);
  assert.deepEqual(readLock(lockFile), { pid: process.pid, alive: true });
  assert.equal(acquireLock(lockFile), false, 'a live holder blocks a second run');

  const dead = spawnSync(process.execPath, ['-e', '']).pid;
  fs.writeFileSync(lockFile, `${String(dead)}\n`);
  assert.equal(readLock(lockFile)?.alive, false);
  assert.equal(acquireLock(lockFile), false, 'a stale lock blocks until removed by hand');
  fs.rmSync(lockFile);
}

// Key: only a clean tree has one (untracked files count even with status.showUntrackedFiles=no),
// and it names HEAD, so a rewritten commit with the same tree gets a new key.
{
  git('config', 'status.showUntrackedFiles', 'no');
  fs.writeFileSync(path.join(root, 'a.txt'), 'a\n');
  assert.equal(gateKey(root), null, 'no commit yet');
  git('add', 'a.txt');
  git('commit', '-q', '-m', 'a');
  fs.writeFileSync(path.join(root, 'untracked.txt'), 'u\n');
  assert.equal(gateKey(root), null, 'untracked files make the tree dirty');
  fs.rmSync(path.join(root, 'untracked.txt'));

  const head = git('rev-parse', 'HEAD');
  const key = gateKey(root);
  assert.equal(key, `${head} - - ${process.version}`, 'no origin/main or main in this repo');
  git('commit', '-q', '--amend', '-m', 'same tree, new commit');
  assert.notEqual(gateKey(root), key, 'a rewritten commit is not the verified one');

  fs.writeFileSync(path.join(root, 'a.txt'), 'b\n');
  assert.equal(gateKey(root), null, 'modified files make the tree dirty');
  git('checkout', '-q', '--', 'a.txt');
}

// Record: the latest line for a key decides, so a failed --force run cancels an earlier pass.
{
  const logFile = path.join(root, 'log');
  const key = 'abc - - v24.15.0';
  fs.writeFileSync(logFile, `${key} pass\nabc - - v24.14.1 pass\n`);
  assert.equal(hasPassed(logFile, key), true);
  assert.equal(hasPassed(logFile, 'abc - - v24'), false, 'a key prefix does not match');
  fs.appendFileSync(logFile, `${key} fail\n`);
  assert.equal(hasPassed(logFile, key), false, 'a later failure cancels the pass');
  fs.appendFileSync(logFile, `${key} pass\n`);
  assert.equal(hasPassed(logFile, key), true);
}

// Preflight: names in-progress git operations, live and stale locks, and a missing signature mode.
{
  const saved = process.env['CHERRY_VINE_SIGNATURE_MODE'];
  delete process.env['CHERRY_VINE_SIGNATURE_MODE'];
  fs.writeFileSync(gitPath(root, 'MERGE_HEAD'), '0'.repeat(40));
  fs.writeFileSync(gitPath(root, 'REVERT_HEAD'), '0'.repeat(40));
  fs.writeFileSync(gitPath(root, LOCK_NAME), `${String(process.pid)}\n`);
  fs.copyFileSync(path.join(repoRoot, '.nvmrc'), path.join(root, '.nvmrc'));
  fs.copyFileSync(path.join(repoRoot, 'package.json'), path.join(root, 'package.json'));

  const problems = preflightProblems(root).join('\n');
  assert.match(problems, /CHERRY_VINE_SIGNATURE_MODE must be enforce/);
  assert.match(problems, /git operation in progress in this worktree \(MERGE_HEAD\)/);
  assert.match(problems, /git operation in progress in this worktree \(REVERT_HEAD\)/);
  assert.match(problems, new RegExp(`a FULL run \\(pid ${String(process.pid)}\\) already holds`));

  const dead = spawnSync(process.execPath, ['-e', '']).pid;
  fs.writeFileSync(gitPath(root, LOCK_NAME), `${String(dead)}\n`);
  assert.match(preflightProblems(root).join('\n'), /stale lock .* which is not running/);

  if (saved !== undefined) process.env['CHERRY_VINE_SIGNATURE_MODE'] = saved;
}

fs.rmSync(root, { recursive: true, force: true });
process.stdout.write('full-gate: ok\n');
