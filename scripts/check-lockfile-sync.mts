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
    if (tempDir.startsWith(`${allocation.root}${path.sep}`) === false) {
      fail(PREFIX, 'Refusing to write outside CHERRY_TMP_ROOT', {
        details: [`tempDir=${tempDir}`, `root=${allocation.root}`],
        fix: FIX,
      });
    }
    const resetResult = runTool('rm', ['-rf', tempDir]);
    if (!resetResult.ok) {
      fail(PREFIX, 'Failed to clear lockfile-sync workspace', {
        details: [resetResult.stderr.trim(), resetResult.stdout.trim()].filter(Boolean),
        fix: FIX,
      });
    }
    const mkdirResult = runTool('mkdir', ['-p', tempDir]);
    if (!mkdirResult.ok) {
      fail(PREFIX, 'Failed to create lockfile-sync workspace', {
        details: [mkdirResult.stderr.trim(), mkdirResult.stdout.trim()].filter(Boolean),
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

    let result;
    try {
      result = runTool('npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund'], {
        cwd: tempDir,
        env,
      });
    } finally {
      const cleanupResult = runTool('rm', ['-rf', tempDir]);
      if (!cleanupResult.ok) {
        fail(PREFIX, 'Failed to clean lockfile-sync workspace', {
          details: [cleanupResult.stderr.trim(), cleanupResult.stdout.trim()].filter(Boolean),
          fix: FIX,
        });
      }
      const recreateResult = runTool('mkdir', ['-p', tempDir]);
      if (!recreateResult.ok) {
        fail(PREFIX, 'Failed to reset lockfile-sync workspace', {
          details: [recreateResult.stderr.trim(), recreateResult.stdout.trim()].filter(Boolean),
          fix: FIX,
        });
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
