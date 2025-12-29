import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ensureTsEsm } from '../lib/ensure-ts-esm.mts';
import { EXECUTION, type ExecutionName } from './registry.mts';

ensureTsEsm();

const PREFIX = 'EXECUTION RUNNER';
const ROOT = process.cwd();

function fail(message: string): never {
  process.stderr.write(`${PREFIX}: ${message}\n`);
  process.exit(1);
}

function isExecutionName(value: string): value is ExecutionName {
  return Object.prototype.hasOwnProperty.call(EXECUTION, value);
}

async function runExecution(): Promise<void> {
  const args = process.argv.slice(2);
  const name = args[0];
  if (name === undefined || name.length === 0) {
    fail('Execution name required');
  }
  if (!isExecutionName(name)) {
    fail(`Unknown execution script: ${name}`);
  }

  const relativePath = EXECUTION[name];
  const absolutePath = path.join(ROOT, relativePath);
  if (fs.existsSync(absolutePath) === false) {
    fail(`Execution script missing: ${relativePath}`);
  }

  const executable = process.argv[0] ?? 'node';
  process.argv = [executable, absolutePath, ...args.slice(1)];
  await import(pathToFileURL(absolutePath).href);
}

void runExecution();
