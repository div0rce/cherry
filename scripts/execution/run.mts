import * as fs from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import '../lib/loaders/config.loader.mjs';
import { ensureTsEsm } from '../lib/ensure-ts-esm.mjs';
import { resolveTmpRoot } from '../lib/tmp-root.mjs';
import { fail } from '../guardrails/lib/fail.mjs';
import { EXECUTION, type ExecutionName } from './registry.mjs';

ensureTsEsm();

const PREFIX = 'EXECUTION RUNNER';
const ROOT = process.cwd();
const FIX = 'Use a valid execution name from scripts/execution/registry.mts.';
const PRISMA_MOCK_SKIP = new Set<ExecutionName>([
  'check:db:optional',
  'check:db:required',
  'check:run-db-tests',
]);

function isExecutionName(value: string): value is ExecutionName {
  return Object.prototype.hasOwnProperty.call(EXECUTION, value);
}

async function maybeRegisterPrismaMock(name: ExecutionName): Promise<void> {
  if (PRISMA_MOCK_SKIP.has(name)) return;
  await import('../lib/loaders/prisma-mock.register.mjs');
}

async function runExecution(): Promise<void> {
  resolveTmpRoot();
  const args = process.argv.slice(2);
  const name = args[0];
  if (name === undefined || name.length === 0) {
    fail(PREFIX, 'Execution name required', { fix: FIX });
  }
  if (!isExecutionName(name)) {
    fail(PREFIX, `Unknown execution script: ${name}`, { fix: FIX });
  }

  const relativePath = EXECUTION[name];
  const absolutePath = path.join(ROOT, relativePath);
  if (fs.existsSync(absolutePath) === false) {
    fail(PREFIX, `Execution script missing: ${relativePath}`, { fix: FIX });
  }

  await maybeRegisterPrismaMock(name);

  const executable = process.argv[0] ?? 'node';
  process.argv = [executable, absolutePath, ...args.slice(1)];
  await import(pathToFileURL(absolutePath).href);
}

void runExecution();
