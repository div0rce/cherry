#!/usr/bin/env node

import * as fs from 'node:fs';
import * as path from 'node:path';
import { z } from 'zod';
import { fail } from './guardrails/lib/fail.mjs';
import { readJsonFile } from './guardrails/lib/read-json.mjs';
import { runTool } from './guardrails/lib/run-tool.mjs';

const ROOT = process.cwd();
const PREFIX = 'check:schema-breaking-plan';
const FIX = 'Add docs/schema-breaking/<migration-id>.md with rationale, backfill/rollback plan, and contract impact.';

const MIGRATIONS_DIR = path.join(ROOT, 'prisma', 'migrations');
const BREAKING_DIR = path.join(ROOT, 'docs', 'schema-breaking');
const MANIFEST_PATH = path.join(ROOT, 'scripts', 'schema', 'manifest.json');

const ManifestSchema = z
  .object({
    allowlistedDestructiveMigrations: z.array(z.string().min(1)).optional(),
  })
  .strict()
  .passthrough();

function guardrailFail(message: string, details?: string[]): never {
  fail(PREFIX, message, { details, fix: FIX });
}

function resolveBaseRef(): string {
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

function diffFiles(range: string): string[] {
  const result = runTool('git', ['diff', '--name-only', range, '--', 'prisma/migrations']);
  if (result.exitCode !== 0) {
    guardrailFail(`Unable to compute diff for ${range}`, [result.stderr.trim(), result.stdout.trim()].filter(Boolean));
  }
  return result.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function readMigrationSql(dirName: string): string | null {
  const sqlPath = path.join(MIGRATIONS_DIR, dirName, 'migration.sql');
  if (!fs.existsSync(sqlPath)) return null;
  return fs.readFileSync(sqlPath, 'utf8');
}

function hasDestructiveSql(content: string): boolean {
  return /\\bDROP\\b/i.test(content) || /\\bALTER\\s+TABLE\\b/i.test(content) || /\\bCASCADE\\b/i.test(content);
}

function loadAllowlist(): Set<string> {
  if (!fs.existsSync(MANIFEST_PATH)) {
    guardrailFail('Missing schema manifest', [path.relative(ROOT, MANIFEST_PATH)]);
  }
  let raw: unknown;
  try {
    raw = readJsonFile(MANIFEST_PATH);
  } catch (error: unknown) {
    guardrailFail('Invalid schema manifest JSON', [error instanceof Error ? error.message : String(error)]);
  }
  const parsed = ManifestSchema.safeParse(raw);
  if (!parsed.success) {
    const [issue] = parsed.error.issues;
    const message = issue?.message ?? parsed.error.message;
    guardrailFail('Invalid schema manifest', [message]);
  }
  const allowlist = parsed.data.allowlistedDestructiveMigrations ?? [];
  return new Set(allowlist);
}

function checkBreakingPlan(dirName: string): void {
  const planPath = path.join(BREAKING_DIR, `${dirName}.md`);
  if (!fs.existsSync(planPath)) {
    guardrailFail('Missing destructive migration plan', [path.relative(ROOT, planPath)]);
  }
  const content = fs.readFileSync(planPath, 'utf8');
  const missing: string[] = [];
  if (!/rationale/i.test(content)) missing.push('rationale');
  if (!/backfill|rollback/i.test(content)) missing.push('backfill/rollback');
  if (!/contract impact/i.test(content)) missing.push('contract impact');
  if (missing.length > 0) {
    guardrailFail('Destructive migration plan missing required sections', [
      `${path.relative(ROOT, planPath)}: missing ${missing.join(', ')}`,
    ]);
  }
}

function main(): void {
  const allowlist = loadAllowlist();
  const base = resolveBaseRef();
  const range = `${base}...HEAD`;
  const changed = diffFiles(range);
  const touchedDirs = new Set<string>();
  for (const filePath of changed) {
    const segments = filePath.split('/');
    const dirName = segments.at(2);
    if (dirName !== undefined && dirName.length > 0) {
      touchedDirs.add(dirName);
    }
  }

  if (touchedDirs.size === 0) {
    process.stdout.write('check:schema-breaking-plan: ok (no migration changes)\\n');
    return;
  }

  const violations: string[] = [];
  for (const dirName of touchedDirs) {
    const content = readMigrationSql(dirName);
    if (content === null) continue;
    if (hasDestructiveSql(content)) {
      if (allowlist.has(dirName)) continue;
      try {
        checkBreakingPlan(dirName);
      } catch (error: unknown) {
        if (error instanceof Error) {
          violations.push(error.message);
        } else {
          violations.push(String(error));
        }
      }
    }
  }

  if (violations.length > 0) {
    guardrailFail('Destructive migrations require schema-breaking plans', violations);
  }

  process.stdout.write('check:schema-breaking-plan: ok\\n');
}

main();
