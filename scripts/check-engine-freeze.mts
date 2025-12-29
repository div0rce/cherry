#!/usr/bin/env node

import { spawnSync } from 'child_process';
import { fail } from './guardrails/lib/fail.mts';

const diffResult = spawnSync('git', ['diff', '--name-only', 'origin/main...HEAD'], {
  encoding: 'utf8',
});

const PREFIX = 'check:engine-freeze';
const FIX = 'Update engine-freeze policy or avoid modifying engine-sensitive files.';

if (diffResult.status !== 0) {
  process.stdout.write(
    'check-engine-freeze: unable to compute diff against origin/main, skipping (no enforcement).\n'
  );
  process.exit(0);
}

const changedFiles = diffResult.stdout
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean);

const engineSensitivePrefixes = [
  'lib/engine/',
  'lib/engine.ts',
  'lib/engine/legacy.ts',
  'lib/vine/',
  'lib/scan-types.ts',
  'lib/engine-invariants.ts',
  'app/api/simulate/',
  'app/api/simulations/',
  'app/api/vine/',
  'app/api/autopilot/',
];

const offending = changedFiles.filter((file) =>
  engineSensitivePrefixes.some((prefix) => file === prefix || file.startsWith(prefix)),
);

if (offending.length > 0) {
  const details = offending.map((file) => `${file}:1:1: engine-freeze violation`);
  fail(PREFIX, 'Engine freeze active: engine-related files changed', { details, fix: FIX });
}

process.stdout.write('check-engine-freeze: OK (no engine-sensitive changes).\n');
