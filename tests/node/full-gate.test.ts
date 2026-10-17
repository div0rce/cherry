import * as assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LOCK_NAME,
  acquireLock,
  cleanTree,
  gitPath,
  hasPassed,
  lockHolder,
  preflightProblems,
} from '../../scripts/lib/full-gate.mjs';

// verify:full's single-writer lock, verified-tree record, and preflight problems.

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..', '..');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cherry-full-gate-'));

function git(...args: string[]): void {
  const result = spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
}

// Lock: one holder at a time; a dead holder's lock is reclaimed.
{
  git('init', '-q');
  const lockFile = gitPath(root, LOCK_NAME);
  assert.equal(acquireLock(lockFile), true);
  assert.equal(lockHolder(lockFile), process.pid);
  assert.equal(acquireLock(lockFile), false, 'a live holder blocks a second run');

  const dead = spawnSync(process.execPath, ['-e', '']).pid;
  assert.equal(typeof dead, 'number');
  fs.writeFileSync(lockFile, `${String(dead)}\n`);
  assert.equal(lockHolder(lockFile), null, 'a dead holder does not count');
  assert.equal(acquireLock(lockFile), true, 'a dead holder lock is reclaimed');
  fs.rmSync(lockFile);
}

// Record: only a clean committed tree has a key; only an exact "<key> pass" line skips.
{
  fs.writeFileSync(path.join(root, 'a.txt'), 'a\n');
  assert.equal(cleanTree(root), null, 'untracked files make the tree dirty');
  git('add', 'a.txt');
  git('commit', '-q', '-m', 'a');
  const tree = cleanTree(root);
  assert.match(tree ?? '', /^[0-9a-f]{40}$/);

  const logFile = path.join(root, 'log');
  const key = `${tree ?? ''} v24.15.0`;
  fs.writeFileSync(logFile, `${key} fail\n${tree ?? ''} v24.14.1 pass\n`);
  assert.equal(hasPassed(logFile, key), false, 'a failed run or another node version does not skip');
  fs.appendFileSync(logFile, `${key} pass\n`);
  assert.equal(hasPassed(logFile, key), true);

  fs.writeFileSync(path.join(root, 'a.txt'), 'b\n');
  assert.equal(cleanTree(root), null, 'modified files make the tree dirty');
}

// Preflight: names an in-progress git operation, a held lock, and a missing signature mode.
{
  const saved = process.env['CHERRY_VINE_SIGNATURE_MODE'];
  delete process.env['CHERRY_VINE_SIGNATURE_MODE'];
  fs.writeFileSync(gitPath(root, 'MERGE_HEAD'), '0'.repeat(40));
  fs.writeFileSync(gitPath(root, LOCK_NAME), `${String(process.pid)}\n`);
  fs.copyFileSync(path.join(repoRoot, '.nvmrc'), path.join(root, '.nvmrc'));
  fs.copyFileSync(path.join(repoRoot, 'package.json'), path.join(root, 'package.json'));

  const problems = preflightProblems(root).join('\n');
  assert.match(problems, /CHERRY_VINE_SIGNATURE_MODE must be enforce/);
  assert.match(problems, /git operation in progress in this worktree \(MERGE_HEAD\)/);
  assert.match(problems, new RegExp(`a FULL run \\(pid ${String(process.pid)}\\) already holds`));

  if (saved !== undefined) process.env['CHERRY_VINE_SIGNATURE_MODE'] = saved;
}

fs.rmSync(root, { recursive: true, force: true });
process.stdout.write('full-gate: ok\n');
