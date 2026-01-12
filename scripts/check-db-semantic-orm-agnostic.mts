import path from 'node:path';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { fail } from './guardrails/lib/fail.mjs';
import { runTool } from './guardrails/lib/run-tool.mjs';

ensureTsEsm();

const PREFIX = 'check:db-semantic-orm-agnostic';
const FIX = 'Use tests/db/_helpers/assert-db-violation.ts and SQLSTATE/constraint names.';
const ROOT = process.cwd();
const TARGET_GLOB = 'tests/db/semantics/**/*.test.{js,ts,tsx}';
const PATTERNS = [
  '\\bPrismaClient[A-Za-z]+Error\\b',
  '\\bPrisma\\s*\\.',
  '\\bP20[0-9]{2}\\b',
  '\\b(err|error|caught)\\s*\\.\\s*code\\b',
];

function main(): void {
  const details: string[] = [];

  for (const pattern of PATTERNS) {
    const result = runTool('rg', ['-n', '--glob', TARGET_GLOB, pattern, ROOT]);
    if (result.exitCode === 0) {
      const matches = result.stdout
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => line.replace(ROOT + path.sep, ''));
      details.push(...matches);
      continue;
    }
    if (result.exitCode !== 1) {
      const detail = result.stderr.trim();
      fail(PREFIX, 'Failed to scan DB semantic tests', {
        details: detail.length > 0 ? [detail] : undefined,
        fix: FIX,
      });
    }
  }

  if (details.length > 0) {
    fail(PREFIX, 'DB semantic tests must be ORM-agnostic', { details, fix: FIX });
  }

  process.stdout.write('check:db-semantic-orm-agnostic: ok\n');
}

main();
