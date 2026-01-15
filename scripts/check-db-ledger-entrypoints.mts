import * as path from 'node:path';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { fail } from './guardrails/lib/fail.mjs';
import { runTool } from './guardrails/lib/run-tool.mjs';

ensureTsEsm();

const PREFIX = 'check:db-ledger-entrypoints';
const FIX =
  'Move CherryPointLedger writes into approved entrypoints (persistence adapter, session flows, or admin clear routes).';
const ROOT = process.cwd();
const WRITE_PATTERN =
  '\\bcherryPointLedger\\.(createMany|create|updateMany|update|deleteMany|delete|upsert)\\b';
const SEARCH_GLOBS = ['!tests/**', '!node_modules/**', '!prisma/**'];
const ALLOWED_FILES = new Set([
  'app/api/admin/clear-ledger/route.ts',
  'app/api/admin/clear-sessions/route.ts',
  'app/api/admin/clear-user/route.ts',
  'lib/adapters/runtime/persistence.prisma.ts',
  'lib/demo-seeder.ts',
  'lib/sessions/confirm-service.ts',
  'lib/verification/verify-session.ts',
  'scripts/audit-integrity.mts',
]);

function normalizePath(target: string): string {
  return target.replace(/\\/g, '/');
}

function listLedgerWrites(): string[] {
  const args = ['-n', WRITE_PATTERN, ROOT];
  for (const glob of SEARCH_GLOBS) {
    args.unshift('--glob', glob);
  }
  const result = runTool('rg', args);
  if (result.exitCode === 1) return [];
  if (result.exitCode !== 0) {
    const detail = result.stderr.trim();
    fail(PREFIX, 'Failed to scan for CherryPointLedger writes', {
      details: detail.length > 0 ? [detail] : undefined,
      fix: FIX,
    });
  }
  return result.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function main(): void {
  const violations: string[] = [];
  const matches = listLedgerWrites();

  for (const match of matches) {
    const lineMatch = match.match(/^(.*):(\d+):/);
    if (lineMatch === null) continue;
    const filePath = lineMatch[1] ?? '';
    const lineNumber = lineMatch[2] ?? '';
    const relPath = normalizePath(path.relative(ROOT, filePath));
    if (ALLOWED_FILES.has(relPath)) continue;
    violations.push(`${relPath}:${lineNumber} ${match}`);
  }

  if (violations.length > 0) {
    fail(PREFIX, 'CherryPointLedger writes must use approved entrypoints', {
      details: violations,
      fix: FIX,
    });
  }

  process.stdout.write('check:db-ledger-entrypoints: ok\n');
}

main();
