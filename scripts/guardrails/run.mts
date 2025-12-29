import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ensureTsEsm } from '../lib/ensure-ts-esm.mts';
import { GUARDRAILS, type GuardrailName } from './registry.mts';

ensureTsEsm();

const PREFIX = 'GUARDRAIL RUNNER';
const ROOT = process.cwd();

function fail(message: string): never {
  process.stderr.write(`${PREFIX}: ${message}\n`);
  process.exit(1);
}

function isGuardrailName(value: string): value is GuardrailName {
  return Object.prototype.hasOwnProperty.call(GUARDRAILS, value);
}

async function runGuardrail(): Promise<void> {
  const args = process.argv.slice(2);
  const name = args[0];
  if (name === undefined || name.length === 0) {
    fail('Guardrail name required');
  }
  if (!isGuardrailName(name)) {
    fail(`Unknown guardrail: ${name}`);
  }

  const relativePath = GUARDRAILS[name];
  const absolutePath = path.join(ROOT, relativePath);
  if (fs.existsSync(absolutePath) === false) {
    fail(`Guardrail script missing: ${relativePath}`);
  }

  const executable = process.argv[0] ?? 'node';
  process.argv = [executable, absolutePath, ...args.slice(1)];
  await import(pathToFileURL(absolutePath).href);
}

void runGuardrail();
