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
    engineVersions: z
      .object({
        behavior: z.string().min(1),
        input: z.string().min(1),
        candidateSpace: z.string().min(1),
        accounting: z.string().min(1),
      })
      .strict(),
    engineFixtures: z
      .object({
        hash: z.string().min(1),
        files: z.array(z.string().min(1)),
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
    const [firstIssue] = parsed.error.issues;
    const message = firstIssue?.message ?? parsed.error.message;
    fail(PREFIX, `Invalid engine-freeze policy`, { details: [message], fix: FIX });
  }
  return parsed.data;
}

loadPolicy();
const baseRef = resolveBaseRef();
const diffResult = runTool('git', ['diff', '--name-only', `${baseRef}...HEAD`]);
if (diffResult.exitCode !== 0) {
  fail(PREFIX, `Unable to compute diff against base ${baseRef}`, {
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
  const policyTouched = changedFiles.includes(path.relative(ROOT, POLICY_PATH));
  if (!policyTouched) {
    const details = offending.map((file) => `${file}:1:1: engine-freeze violation`);
    fail(PREFIX, 'Engine freeze active: engine-related files changed without policy update', {
      details,
      fix: FIX,
    });
  }
}

process.stdout.write('check-engine-freeze: OK (engine policy present).\n');

function resolveBaseRef(): string {
  const override = process.env.CHERRY_BASE_REF;
  if (override !== undefined && override.length > 0) {
    return override;
  }
  const originBase = runTool('git', ['merge-base', 'HEAD', 'origin/main']);
  if (originBase.exitCode === 0 && originBase.stdout.trim().length > 0) {
    return originBase.stdout.trim();
  }
  const mainBase = runTool('git', ['merge-base', 'HEAD', 'main']);
  if (mainBase.exitCode === 0 && mainBase.stdout.trim().length > 0) {
    return mainBase.stdout.trim();
  }
  const headParent = runTool('git', ['rev-parse', '--verify', 'HEAD~1']);
  if (headParent.exitCode === 0 && headParent.stdout.trim().length > 0) {
    return headParent.stdout.trim();
  }
  return 'HEAD';
}
