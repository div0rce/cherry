#!/usr/bin/env node

import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { z } from 'zod';
import { fail } from './guardrails/lib/fail.mjs';
import { readJsonFile } from './guardrails/lib/read-json.mjs';

const ROOT = process.cwd();
const PREFIX = 'check:engine-version-gates';
const POLICY_PATH = path.join(ROOT, 'scripts', 'guardrails', 'engine-freeze.policy.json');
const VERSION_PATH = path.join(ROOT, 'lib', 'engine', 'version.ts');
const FIX = 'Update engine version gates and engine-freeze policy in a guardrails-only commit.';

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

function normalizeText(value: string): string {
  return value.replace(/\r\n/g, '\n');
}

function hashFixtures(fixtures: string[]): string {
  const hash = crypto.createHash('sha256');
  const sorted = [...fixtures].sort();
  for (const relPath of sorted) {
    const absolute = path.join(ROOT, relPath);
    if (!fs.existsSync(absolute)) {
      fail(PREFIX, `Missing engine fixture: ${relPath}`, { fix: FIX });
    }
    const content = normalizeText(fs.readFileSync(absolute, 'utf8'));
    hash.update(relPath);
    hash.update('\n');
    hash.update(content);
    hash.update('\n');
  }
  return hash.digest('hex');
}

function loadPolicy(): z.infer<typeof PolicySchema> {
  if (!fs.existsSync(POLICY_PATH)) {
    fail(PREFIX, `Missing engine-freeze policy at ${POLICY_PATH}`, { fix: FIX });
  }
  let raw: unknown;
  try {
    raw = readJsonFile(POLICY_PATH);
  } catch (error: unknown) {
    fail(PREFIX, 'Invalid engine-freeze policy JSON', {
      details: [error instanceof Error ? error.message : String(error)],
      fix: FIX,
    });
  }
  if (raw !== null && typeof raw === 'object') {
    const keys = Object.keys(raw as Record<string, unknown>);
    const allowed = new Set(['engineVersions', 'engineFixtures']);
    const extras = keys.filter((key) => !allowed.has(key));
    if (extras.length > 0) {
      fail(PREFIX, 'Narrative keys are forbidden in engine-freeze policy', {
        details: extras.map((key) => `remove=${key}`),
        fix: 'Move narrative metadata to docs/engine-freeze.md.',
      });
    }
  }

  const parsed = PolicySchema.safeParse(raw);
  if (!parsed.success) {
    const [firstIssue] = parsed.error.issues;
    const message = firstIssue?.message ?? parsed.error.message;
    fail(PREFIX, 'Invalid engine-freeze policy', { details: [message], fix: FIX });
  }
  return parsed.data;
}

function extractVersion(content: string, name: string): string | undefined {
  const pattern = new RegExp(`${name}\\s*=\\s*['"]([^'"]+)['"]`);
  const match = content.match(pattern);
  return match?.[1];
}

function parseVersions(): Record<string, string> {
  if (!fs.existsSync(VERSION_PATH)) {
    fail(PREFIX, `Missing engine version gates at ${VERSION_PATH}`, { fix: FIX });
  }
  const content = fs.readFileSync(VERSION_PATH, 'utf8');
  const versions: Record<string, string> = {};
  const keys = [
    'engineBehaviorVersion',
    'engineInputVersion',
    'engineCandidateSpaceVersion',
    'engineAccountingVersion',
  ];
  for (const key of keys) {
    const value = extractVersion(content, key);
    if (value !== undefined) {
      versions[key] = value;
    }
  }
  return versions;
}

function assertVersionFormat(name: string, value: string): void {
  if (!/_v\d+$/.test(value)) {
    fail(PREFIX, `Invalid version format for ${name}`, {
      details: [`value=${value}`],
      fix: FIX,
    });
  }
}

function main(): void {
  const policy = loadPolicy();
  const versions = parseVersions();

  const expected: Record<string, string> = {
    behavior: 'engineBehaviorVersion',
    input: 'engineInputVersion',
    candidateSpace: 'engineCandidateSpaceVersion',
    accounting: 'engineAccountingVersion',
  };

  for (const [policyKey, sourceKey] of Object.entries(expected)) {
    const policyValue = policy.engineVersions[policyKey as keyof typeof policy.engineVersions];
    const sourceValue = versions[sourceKey];
    if (sourceValue === undefined) {
      fail(PREFIX, `Missing ${sourceKey} in lib/engine/version.ts`, { fix: FIX });
    }
    assertVersionFormat(sourceKey, sourceValue);
    if (policyValue !== sourceValue) {
      fail(PREFIX, `engineVersions.${policyKey} mismatch`, {
        details: [`policy=${policyValue}`, `code=${sourceValue}`],
        fix: FIX,
      });
    }
  }

  const behaviorVersion = policy.engineVersions.behavior;
  // TODO: Replace placeholder engine fixtures with real replay traces.
  if (!behaviorVersion.endsWith('_v1') && policy.engineFixtures.files.length === 0) {
    fail(PREFIX, 'Engine fixtures required for behavior versions beyond v1', {
      details: [`behavior=${behaviorVersion}`],
      fix: FIX,
    });
  }

  const sortedFiles = [...policy.engineFixtures.files].sort();
  const isSorted = sortedFiles.every((value, index) => value === policy.engineFixtures.files[index]);
  if (!isSorted) {
    fail(PREFIX, 'engineFixtures.files must be sorted', { fix: FIX });
  }

  if (policy.engineFixtures.files.length === 0) {
    fail(PREFIX, 'engineFixtures.files must not be empty', { fix: FIX });
  }

  const actualHash = hashFixtures(policy.engineFixtures.files);
  if (actualHash !== policy.engineFixtures.hash) {
    fail(PREFIX, 'engine fixture hash mismatch', {
      details: [`expected=${policy.engineFixtures.hash}`, `actual=${actualHash}`],
      fix: FIX,
    });
  }

  process.stdout.write('check:engine-version-gates: ok\\n');
}

main();
