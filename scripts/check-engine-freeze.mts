#!/usr/bin/env node

import { spawnSync } from 'child_process';

const diffResult = spawnSync('git', ['diff', '--name-only', 'origin/main...HEAD'], {
  encoding: 'utf8',
});

if (diffResult.status !== 0) {
  console.log('check-engine-freeze: unable to compute diff against origin/main, skipping (no enforcement).');
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
  console.log('Engine freeze active: engine-related files changed:');
  offending.forEach((file) => console.log(file));
  process.exit(1);
}

console.log('check-engine-freeze: OK (no engine-sensitive changes).');
