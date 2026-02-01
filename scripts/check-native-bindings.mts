import { createRequire } from 'node:module';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { fail } from './guardrails/lib/fail.mjs';

ensureTsEsm();

const PREFIX = 'check:native-bindings';
const FIX = 'Ensure native bindings are installed deterministically (npm ci + pinned deps).';
const requireFn = createRequire(import.meta.url);

function guardrailFail(message: string, details: string[] = []): never {
  fail(PREFIX, message, { details, fix: FIX });
}

const targets = ['@tailwindcss/oxide', 'lightningcss'] as const;
for (const target of targets) {
  try {
    requireFn(target);
  } catch (error: unknown) {
    guardrailFail(`Failed to load native binding: ${target}`, [String(error)]);
  }
}

process.stdout.write('check:native-bindings: ok\n');
