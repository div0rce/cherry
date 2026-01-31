import * as fs from 'node:fs';
import * as path from 'node:path';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { fail } from './guardrails/lib/fail.mjs';
import { runTool } from './guardrails/lib/run-tool.mjs';

ensureTsEsm();

const PREFIX = 'check:replay-staging-empty';
const ROOT = process.cwd();
const STAGING_REL = path.join('tests', 'replay', '_staging');
const STAGING_ROOT = path.join(ROOT, STAGING_REL);
const FIX = 'Move replay traces into tests/replay/<YYYY-MM>/<traceId>/ and clear _staging.';

type Violation = {
  path: string;
  reason: 'tracked' | 'untracked';
};

function listFiles(dir: string): string[] {
  const results: string[] = [];
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) continue;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      if (entry.isFile()) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

function relativePath(filePath: string): string {
  return path.relative(ROOT, filePath).split(path.sep).join('/');
}

function failIfViolations(violations: Violation[]): void {
  if (violations.length === 0) return;
  const details = violations.map((violation) => `${violation.path}: ${violation.reason}`);
  fail(PREFIX, 'Replay staging artifacts must not be committed', { details, fix: FIX });
}

function main(): void {
  if (!fs.existsSync(STAGING_ROOT)) {
    process.stdout.write('check:replay-staging-empty: ok\n');
    return;
  }

  const violations: Violation[] = [];
  const tracked = runTool('git', ['ls-files', '--', STAGING_REL]);
  if (tracked.exitCode === 0) {
    const trackedFiles = tracked.stdout
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    for (const filePath of trackedFiles) {
      violations.push({ path: filePath, reason: 'tracked' });
    }
  }

  const files = listFiles(STAGING_ROOT);
  for (const filePath of files) {
    const rel = relativePath(filePath);
    violations.push({ path: rel, reason: 'untracked' });
  }

  failIfViolations(violations);
  process.stdout.write('check:replay-staging-empty: ok\n');
}

main();
