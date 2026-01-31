import * as fs from 'node:fs';
import * as path from 'node:path';
import { allocateTempDir } from './lib/tmp/allocate.mjs';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { buildDeterministicEnv } from './lib/deterministic-env.mjs';
import { asMessage } from './guardrails/lib/error.mjs';
import { fail } from './guardrails/lib/fail.mjs';
import { runTool } from './guardrails/lib/run-tool.mjs';

ensureTsEsm();

const PREFIX = 'check:lockfile-sync';
const FIX = 'Run npm install to sync package-lock.json with package.json.';
const ROOT_ENV = process.env['CHERRY_LOCKFILE_SYNC_ROOT'];
const ROOT = ROOT_ENV !== undefined && ROOT_ENV !== ''
  ? path.resolve(ROOT_ENV)
  : process.cwd();
const PACKAGE_JSON = path.join(ROOT, 'package.json');
const PACKAGE_LOCK = path.join(ROOT, 'package-lock.json');
const WORK_SUBPATH = 'lockfile-sync/work';
const LOCK_FILENAME = '.lock';

function ensureExists(filePath: string, label: string): void {
  if (fs.existsSync(filePath)) return;
  fail(PREFIX, `${label} missing`, {
    details: [path.normalize(path.relative(ROOT, filePath))],
    fix: 'Restore missing package.json or package-lock.json.',
  });
}

function main(): void {
  try {
    ensureExists(PACKAGE_JSON, 'package.json');
    ensureExists(PACKAGE_LOCK, 'package-lock.json');

    const allocation = allocateTempDir({ bucket: 'npm', subpath: WORK_SUBPATH });
    const tempDir = allocation.path;
    const lockDir = path.dirname(tempDir);
    const lockPath = path.join(lockDir, LOCK_FILENAME);
    let lockFd: number | null = null;
    if (tempDir.startsWith(`${allocation.root}${path.sep}`) === false) {
      fail(PREFIX, 'Refusing to write outside CHERRY_TMP_ROOT', {
        details: [`tempDir=${tempDir}`, `root=${allocation.root}`],
        fix: FIX,
      });
    }
    try {
      lockFd = fs.openSync(lockPath, 'wx');
    } catch (error: unknown) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'EEXIST') {
        fail(PREFIX, 'Lockfile-sync workspace already in use', {
          details: [`lock=${lockPath}`],
          fix: 'Ensure no other lockfile-sync is running, then delete the stale lock file.',
        });
      }
      fail(PREFIX, 'Failed to acquire lockfile-sync lock', {
        details: [String(error)],
        fix: FIX,
      });
    }
    let result;
    try {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
        fs.mkdirSync(tempDir, { recursive: true, mode: 0o700 });
      } catch (error: unknown) {
        fail(PREFIX, 'Failed to reset lockfile-sync workspace', {
          details: [String(error)],
          fix: FIX,
        });
      }
      fs.copyFileSync(PACKAGE_JSON, path.join(tempDir, 'package.json'));
      fs.copyFileSync(PACKAGE_LOCK, path.join(tempDir, 'package-lock.json'));

      const env = buildDeterministicEnv();
      env['npm_config_audit'] = 'false';
      env['npm_config_fund'] = 'false';
      env['npm_config_update_notifier'] = 'false';
      env['npm_config_progress'] = 'false';

      result = runTool('npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund'], {
        cwd: tempDir,
        env,
      });
    } finally {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
        fs.mkdirSync(tempDir, { recursive: true, mode: 0o700 });
      } catch (error: unknown) {
        fail(PREFIX, 'Failed to clean lockfile-sync workspace', {
          details: [String(error)],
          fix: FIX,
        });
      }
      if (lockFd !== null) {
        try {
          fs.closeSync(lockFd);
        } catch {
          // best effort
        }
        lockFd = null;
      }
      try {
        fs.unlinkSync(lockPath);
      } catch {
        // best effort
      }
    }

    if (!result.ok) {
      const relativeRoot = path.relative(process.cwd(), ROOT);
      const rootDisplay = relativeRoot.length > 0 ? relativeRoot : '.';
      const details: string[] = [
        `root=${path.normalize(rootDisplay)}`,
        `exitCode=${result.exitCode}`,
      ];
      if (result.stdout.trim().length > 0) {
        details.push(`stdout=${result.stdout.trim()}`);
      }
      if (result.stderr.trim().length > 0) {
        details.push(`stderr=${result.stderr.trim()}`);
      }
      fail(PREFIX, 'npm ci failed; package-lock.json is out of sync with package.json', {
        details,
        fix: FIX,
      });
    }

    process.stdout.write('check:lockfile-sync: ok\n');
  } catch (error: unknown) {
    const message = asMessage(error);
    fail(PREFIX, `Guardrail crashed: ${message}`, { fix: FIX });
  }
}

main();
