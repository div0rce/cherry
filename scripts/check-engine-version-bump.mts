#!/usr/bin/env node

import * as path from 'node:path';
import { z } from 'zod';
import { fail } from './guardrails/lib/fail.mjs';
import { parseJson, readJsonFile } from './guardrails/lib/read-json.mjs';
import { runTool } from './guardrails/lib/run-tool.mjs';

const ROOT = process.cwd();
const PREFIX = 'check:engine-version-bump';
const POLICY_PATH = path.join(ROOT, 'scripts', 'guardrails', 'engine-freeze.policy.json');
const VERSION_PATH = 'lib/engine/version.ts';
const FIX =
  'Bump engine version gates and update engine-freeze baseline in a separate chore(engine-freeze) commit.';

const PolicySchema = z
  .object({
    baseline: z.string().min(1),
  })
  .strict();

const ENGINE_SENSITIVE_PREFIXES = [
  'lib/engine/',
  'lib/engine.ts',
  'lib/engine/legacy.ts',
  'lib/engine/input/',
  'lib/authority/',
  'lib/vine/',
  'lib/scan-types.ts',
  'lib/engine-invariants.ts',
  'app/api/simulate/',
  'app/api/simulations/',
  'app/api/vine/',
  'app/api/autopilot/',
];

function guardrailFail(message: string, details?: string[]): never {
  fail(PREFIX, message, { details, fix: FIX });
}

function loadPolicy(): z.infer<typeof PolicySchema> {
  let raw: unknown;
  try {
    raw = readJsonFile(POLICY_PATH);
  } catch (error: unknown) {
    guardrailFail('Invalid engine-freeze policy JSON', [
      error instanceof Error ? error.message : String(error),
    ]);
  }
  const parsed = PolicySchema.safeParse(raw);
  if (!parsed.success) {
    const [issue] = parsed.error.issues;
    const message = issue?.message ?? parsed.error.message;
    guardrailFail('Invalid engine-freeze policy', [message]);
  }
  return parsed.data;
}

function parsePrefix(message: string): string | null {
  const firstLine = message
    .split(/\\r?\\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  if (firstLine === undefined || firstLine.length === 0) return null;
  const match = firstLine.match(/^([a-z-]+(?:\\([^)]+\\))?):/);
  return match?.at(1) ?? null;
}

function getPolicyCommitMessages(): { latest: string; previous: string | null } {
  const log = runTool('git', [
    'log',
    '--format=%H',
    '--',
    path.relative(ROOT, POLICY_PATH),
  ]);
  if (log.exitCode !== 0) {
    guardrailFail('Unable to read policy commit history', [log.stderr.trim(), log.stdout.trim()].filter(Boolean));
  }
  const commits = log.stdout
    .split('\\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const latestCommit = commits[0];
  if (latestCommit === undefined) {
    guardrailFail('No commit history for engine-freeze policy');
  }
  const previousCommit = commits[1] ?? null;
  const latestMessage = runTool('git', ['log', '-n', '1', '--format=%B', latestCommit]);
  if (latestMessage.exitCode !== 0) {
    guardrailFail('Unable to read policy commit message', [latestMessage.stderr.trim(), latestMessage.stdout.trim()].filter(Boolean));
  }
  return { latest: latestMessage.stdout.trim(), previous: previousCommit };
}

function loadBaselineFromCommit(commit: string): string {
  const show = runTool('git', ['show', `${commit}:${path.relative(ROOT, POLICY_PATH)}`]);
  if (show.exitCode !== 0) {
    guardrailFail('Unable to read policy from commit', [show.stderr.trim(), show.stdout.trim()].filter(Boolean));
  }
  let parsed: unknown;
  try {
    parsed = parseJson(show.stdout);
  } catch (error: unknown) {
    guardrailFail('Invalid policy JSON in history', [error instanceof Error ? error.message : String(error)]);
  }
  const data = PolicySchema.safeParse(parsed);
  if (!data.success) {
    const [issue] = data.error.issues;
    const message = issue?.message ?? data.error.message;
    guardrailFail('Invalid policy schema in history', [message]);
  }
  return data.data.baseline;
}

function diffFiles(range: string): string[] {
  const result = runTool('git', ['diff', '--name-only', range]);
  if (result.exitCode !== 0) {
    guardrailFail(`Unable to compute diff for ${range}`, [result.stderr.trim(), result.stdout.trim()].filter(Boolean));
  }
  return result.stdout
    .split('\\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function isEngineSensitive(filePath: string): boolean {
  if (filePath === VERSION_PATH) return false;
  return ENGINE_SENSITIVE_PREFIXES.some((prefix) => filePath === prefix || filePath.startsWith(prefix));
}

function main(): void {
  const policy = loadPolicy();
  const { latest, previous } = getPolicyCommitMessages();
  const latestPrefix = parsePrefix(latest);

  const baseline = policy.baseline;
  let prevBaseline: string | null = null;
  if (previous !== null) {
    prevBaseline = loadBaselineFromCommit(previous);
  }

  const baselineChanged = prevBaseline !== null && prevBaseline !== baseline;
  const range = baselineChanged ? `${prevBaseline}...${baseline}` : `${baseline}...HEAD`;
  const changed = diffFiles(range);

  const engineChanges = changed.filter(isEngineSensitive);
  if (engineChanges.length === 0) {
    process.stdout.write('check:engine-version-bump: ok (no engine-sensitive diffs)\\n');
    return;
  }

  const versionTouched = changed.includes(VERSION_PATH);
  if (!versionTouched) {
    guardrailFail('Engine-sensitive changes require engine version bump', [
      ...engineChanges.map((filePath) => `${filePath}:1:1: engine-version-bump-required`),
      `missing=${VERSION_PATH}`,
    ]);
  }

  if (!baselineChanged) {
    guardrailFail('Engine-sensitive changes require an engine-freeze baseline bump', [
      'Update scripts/guardrails/engine-freeze.policy.json in a chore(engine-freeze) commit.',
    ]);
  }

  if (latestPrefix !== 'chore(engine-freeze)') {
    guardrailFail('Engine-freeze baseline must be updated in a separate chore(engine-freeze) commit', [
      `found=${latestPrefix ?? 'none'}`,
      'expected=chore(engine-freeze)',
    ]);
  }

  process.stdout.write('check:engine-version-bump: ok\\n');
}

main();
