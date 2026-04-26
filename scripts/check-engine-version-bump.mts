#!/usr/bin/env node

import * as path from 'node:path';
import { fail } from './guardrails/lib/fail.mjs';
import { runTool } from './guardrails/lib/run-tool.mjs';

const ROOT = process.cwd();
const PREFIX = 'check:engine-version-bump';
const POLICY_PATH = path.join(ROOT, 'scripts', 'guardrails', 'engine-freeze.policy.json');
const VERSION_PATH = 'lib/engine/version.ts';
const FIX =
  'Bump engine version gates and update engine-freeze baseline in a separate chore(engine-freeze) commit.';

const ENGINE_SENSITIVE_PREFIXES = [
  'lib/engine/',
  'lib/engine.ts',
  'lib/engine/legacy.ts',
  'lib/engine/input/',
  'lib/replay/',
  'lib/adapters/runtime/replay-recorder.ts',
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

function resolveBaseRef(): string {
  const override = process.env['CHERRY_BASE_REF'];
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

function parsePrefix(message: string): string | null {
  const firstLine = message
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  if (firstLine === undefined || firstLine.length === 0) return null;
  if (firstLine.startsWith('chore(engine-freeze):')) {
    return 'chore(engine-freeze)';
  }
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
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const latestCommit = commits[0];
  if (latestCommit === undefined) {
    guardrailFail('No commit history for engine-freeze policy');
  }
  const previousCommit = commits[1] ?? null;
  const latestMessage = runTool('git', ['log', '-n', '1', '--format=%s', latestCommit]);
  if (latestMessage.exitCode !== 0) {
    guardrailFail('Unable to read policy commit message', [latestMessage.stderr.trim(), latestMessage.stdout.trim()].filter(Boolean));
  }
  return { latest: latestMessage.stdout.trim(), previous: previousCommit };
}

function diffFiles(range: string): string[] {
  const result = runTool('git', ['diff', '--name-only', range]);
  if (result.exitCode !== 0) {
    guardrailFail(`Unable to compute diff for ${range}`, [result.stderr.trim(), result.stdout.trim()].filter(Boolean));
  }
  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function collectChangedFiles(baseRange: string): string[] {
  const changed = new Set<string>();
  for (const filePath of diffFiles(baseRange)) {
    changed.add(filePath);
  }
  for (const args of [
    ['diff', '--name-only'],
    ['diff', '--name-only', '--cached'],
  ]) {
    const result = runTool('git', args);
    if (result.exitCode !== 0) {
      guardrailFail('Unable to compute working tree diff', [
        result.stderr.trim(),
        result.stdout.trim(),
      ].filter(Boolean));
    }
    for (const filePath of result.stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)) {
      changed.add(filePath);
    }
  }
  return [...changed].sort();
}

function isEngineSensitive(filePath: string): boolean {
  if (filePath === VERSION_PATH) return false;
  return ENGINE_SENSITIVE_PREFIXES.some((prefix) => filePath === prefix || filePath.startsWith(prefix));
}

function main(): void {
  const { latest } = getPolicyCommitMessages();
  const latestPrefix = parsePrefix(latest);

  const baseRef = resolveBaseRef();
  const baseRange = `${baseRef}...HEAD`;
  const baseChanged = collectChangedFiles(baseRange);

  const engineChanges = baseChanged.filter(isEngineSensitive);
  if (engineChanges.length === 0) {
    process.stdout.write('check:engine-version-bump: ok (no engine-sensitive diffs)\\n');
    return;
  }

  const versionTouched = baseChanged.includes(VERSION_PATH);
  const policyTouched = baseChanged.includes(path.relative(ROOT, POLICY_PATH));
  if (!versionTouched) {
    guardrailFail('Engine-sensitive changes require engine version bump', [
      ...engineChanges.map((filePath) => `${filePath}:1:1: engine-version-bump-required`),
      `missing=${VERSION_PATH}`,
    ]);
  }

  if (!policyTouched) {
    guardrailFail('Engine-sensitive changes require an engine-freeze policy update', [
      path.relative(ROOT, POLICY_PATH),
    ]);
  }

  if (latestPrefix !== 'chore(engine-freeze)') {
    guardrailFail('Engine-freeze policy must be updated in a separate chore(engine-freeze) commit', [
      `found=${latestPrefix ?? 'none'}`,
      'expected=chore(engine-freeze)',
    ]);
  }

  process.stdout.write('check:engine-version-bump: ok\\n');
}

main();
