import * as path from 'node:path';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { importUnknown } from './guardrails/lib/import-typed.mjs';

ensureTsEsm();

const entry = path.join(
  process.cwd(),
  'scripts',
  'guardrails',
  'checks',
  'engine-optimality-version.mts'
);
await importUnknown(entry);
