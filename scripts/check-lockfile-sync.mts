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

    const allocation = allocateTempDir({ bucket: 'npm', subpath: 'lockfile-sync' });
    const tempDir = allocation.path;
    fs.copyFileSync(PACKAGE_JSON, path.join(tempDir, 'package.json'));
    fs.copyFileSync(PACKAGE_LOCK, path.join(tempDir, 'package-lock.json'));

    const env = buildDeterministicEnv();
    env['npm_config_audit'] = 'false';
    env['npm_config_fund'] = 'false';
    env['npm_config_update_notifier'] = 'false';
    env['npm_config_progress'] = 'false';

    const result = runTool('npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund'], {
      cwd: tempDir,
      env,
    });

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
