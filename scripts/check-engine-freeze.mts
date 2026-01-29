#!/usr/bin/env node

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { z } from 'zod';
import { fail } from './guardrails/lib/fail.mjs';
import { readJsonFile } from './guardrails/lib/read-json.mjs';
import { runTool } from './guardrails/lib/run-tool.mjs';

const ROOT = process.cwd();
const PREFIX = 'check:engine-freeze';
const POLICY_PATH = path.join(ROOT, 'scripts', 'guardrails', 'engine-freeze.policy.json');
const FIX = `Update ${path.relative(ROOT, POLICY_PATH)} or avoid modifying engine-sensitive files.`;
const ENGINE_INPUT_PATH = path.join(ROOT, 'lib', 'engine', 'input', 'EngineInput.ts');

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
    engineInput: z
      .object({
        version: z.string().min(1),
        fixtureHash: z.string().min(1),
        fixtures: z.array(z.string().min(1)).min(1),
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

const policy = loadPolicy();
const baseline = policy.baseline;
const engineInputPolicy = policy.engineInput;
assertEngineInputBoundary();

function normalizeText(input: string): string {
  return input.replace(/\r\n/g, '\n');
}

function hashEngineInputFixtures(fixtures: string[]): string {
  const hash = crypto.createHash('sha256');
  const sorted = [...fixtures].sort();
  for (const relPath of sorted) {
    const absolute = path.join(ROOT, relPath);
    if (!fs.existsSync(absolute)) {
      fail(PREFIX, `Missing engine input fixture: ${relPath}`, { fix: FIX });
    }
    const content = normalizeText(fs.readFileSync(absolute, 'utf8'));
    hash.update(relPath);
    hash.update('\n');
    hash.update(content);
    hash.update('\n');
  }
  return hash.digest('hex');
}

function loadEngineInputSource(): { content: string; version: string } {
  if (!fs.existsSync(ENGINE_INPUT_PATH)) {
    fail(PREFIX, `Missing EngineInput definition at ${ENGINE_INPUT_PATH}`, { fix: FIX });
  }
  const content = fs.readFileSync(ENGINE_INPUT_PATH, 'utf8');
  const versionMatch = content.match(/engineInputVersion\s*=\s*['"](?<version>[^'"]+)['"]/);
  const version = versionMatch?.groups?.['version'];
  if (version === undefined || version.length === 0) {
    fail(PREFIX, 'Unable to resolve engineInputVersion from EngineInput.ts', { fix: FIX });
  }
  return { content, version };
}

function assertEngineInputBoundary(): void {
  const { content: inputContent, version } = loadEngineInputSource();

  if (engineInputPolicy.version !== version) {
    fail(PREFIX, 'engineInputVersion mismatch', {
      details: [
        `policy=${engineInputPolicy.version}`,
        `code=${version}`,
      ],
      fix: FIX,
    });
  }

  const fixtureHash = hashEngineInputFixtures(engineInputPolicy.fixtures);
  if (fixtureHash !== engineInputPolicy.fixtureHash) {
    fail(PREFIX, 'engine input fixture hash mismatch', {
      details: [`expected=${engineInputPolicy.fixtureHash}`, `actual=${fixtureHash}`],
      fix: FIX,
    });
  }

  if (!inputContent.includes('__version')) {
    fail(PREFIX, 'EngineInput must include __version field', { fix: FIX });
  }

  const fromLegacyPath = path.join(ROOT, 'lib', 'engine', 'input', 'fromLegacy.ts');
  if (!fs.existsSync(fromLegacyPath)) {
    fail(PREFIX, `Missing fromLegacy adapter at ${fromLegacyPath}`, { fix: FIX });
  }
  const adapterContent = fs.readFileSync(fromLegacyPath, 'utf8');
  if (!adapterContent.includes('__version: engineInputVersion')) {
    fail(PREFIX, 'fromLegacy must set __version: engineInputVersion', { fix: FIX });
  }

  const validatePath = path.join(ROOT, 'lib', 'engine', 'input', 'validate.ts');
  if (!fs.existsSync(validatePath)) {
    fail(PREFIX, `Missing engine input validator at ${validatePath}`, { fix: FIX });
  }
  const validateContent = fs.readFileSync(validatePath, 'utf8');
  if (!validateContent.includes('engineInputVersion')) {
    fail(PREFIX, 'validateEngineInput must assert engineInputVersion', { fix: FIX });
  }
}

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
