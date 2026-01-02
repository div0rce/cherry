#!/usr/bin/env node

import { fail } from './guardrails/lib/fail.mts';
import { runTool } from './guardrails/lib/run-tool.mts';

const diffResult = runTool('git', ['diff', '--name-only', 'origin/main...HEAD']);

const PREFIX = 'check:engine-freeze';
const FIX = 'Update engine-freeze policy or avoid modifying engine-sensitive files.';

if (diffResult.exitCode !== 0) {
  process.stdout.write(
    'check-engine-freeze: unable to compute diff against origin/main, skipping (no enforcement).\n'
  );
} else {
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
}
