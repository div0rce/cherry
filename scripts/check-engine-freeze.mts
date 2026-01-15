#!/usr/bin/env node

import * as fs from 'node:fs';
import * as path from 'node:path';
import { z } from 'zod';
import { fail } from './guardrails/lib/fail.mjs';
import { readJsonFile } from './guardrails/lib/read-json.mjs';
import { runTool } from './guardrails/lib/run-tool.mjs';

const ROOT = process.cwd();
const PREFIX = 'check:engine-freeze';
const POLICY_PATH = path.join(ROOT, 'scripts', 'guardrails', 'engine-freeze.policy.json');
const FIX = `Update ${path.relative(ROOT, POLICY_PATH)} or avoid modifying engine-sensitive files.`;

const PolicySchema = z
  .object({
    status: z.literal('ACTIVE'),
    lastUpdated: z.string().min(1),
    baseline: z.string().min(1),
    contract: z
      .object({
        ranked: z.literal(true),
        deterministic: z.literal(true),
        accountingSafe: z.literal(true),
        unsafeDecisionsForbidden: z.literal(true),
        outputType: z.literal('EngineDecisionWithAccounting[]'),
      })
      .strict(),
  })
  .strict();

function loadPolicy(): z.infer<typeof PolicySchema> {
  if (!fs.existsSync(POLICY_PATH)) {
    fail(PREFIX, `Missing engine-freeze policy at ${POLICY_PATH}`, { fix: FIX });
  }
  let raw: unknown;
  try {
    raw = readJsonFile(POLICY_PATH);
  } catch (error: unknown) {
    fail(PREFIX, `Invalid engine-freeze policy JSON`, {
      details: [error instanceof Error ? error.message : String(error)],
      fix: FIX,
    });
  }
  const parsed = PolicySchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const message = first?.message ?? parsed.error.message;
    fail(PREFIX, `Invalid engine-freeze policy`, { details: [message], fix: FIX });
  }
  return parsed.data;
}

const policy = loadPolicy();
const baseline = policy.baseline;

const baselineResult = runTool('git', ['rev-parse', '--verify', baseline]);
if (baselineResult.exitCode !== 0) {
  fail(PREFIX, `Baseline commit not found: ${baseline}`, {
    details: [baselineResult.stderr.trim(), baselineResult.stdout.trim()].filter(Boolean),
    fix: FIX,
  });
}

const ancestorResult = runTool('git', ['merge-base', '--is-ancestor', baseline, 'HEAD']);
if (ancestorResult.exitCode !== 0) {
  fail(PREFIX, `Baseline commit is not an ancestor of HEAD: ${baseline}`, {
    fix: FIX,
  });
}

const diffResult = runTool('git', ['diff', '--name-only', `${baseline}...HEAD`]);
if (diffResult.exitCode !== 0) {
  fail(PREFIX, `Unable to compute diff against baseline ${baseline}`, {
    details: [diffResult.stderr.trim(), diffResult.stdout.trim()].filter(Boolean),
    fix: FIX,
  });
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
