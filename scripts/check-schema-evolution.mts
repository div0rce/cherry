#!/usr/bin/env node

import * as fs from 'node:fs';
import * as path from 'node:path';
import { z } from 'zod';
import { fail } from './guardrails/lib/fail.mjs';
import { readJsonFile } from './guardrails/lib/read-json.mjs';
import { runTool } from './guardrails/lib/run-tool.mjs';

const ROOT = process.cwd();
const PREFIX = 'check:schema-evolution';
const FIX = 'Update schema manifest + docs/schema-evolution.md and follow migration hygiene.';

const MIGRATIONS_DIR = path.join(ROOT, 'prisma', 'migrations');
const MANIFEST_PATH = path.join(ROOT, 'scripts', 'schema', 'manifest.json');
const DOC_PATH = path.join(ROOT, 'docs', 'schema-evolution.md');
const CONFIG_SNAPSHOT_PATH = path.join(ROOT, 'docs', 'config-snapshot.md');
const ENV_CHECKS_PATH = path.join(ROOT, '.github', 'workflows', 'env-checks.yml');

const ManifestSchema = z
  .object({
    schemaVersion: z.string().min(1),
    lastMigration: z.string().min(1),
    invariantsVersion: z.string().min(1),
    allowlistedDestructiveMigrations: z.array(z.string().min(1)).optional(),
  })
  .strict();

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

function diffFiles(range: string, extra: string[] = []): string[] {
  const args = ['diff', '--name-only', range, ...extra];
  const result = runTool('git', args);
  if (result.exitCode !== 0) {
    guardrailFail(`Unable to compute diff for ${range}`, [result.stderr.trim(), result.stdout.trim()].filter(Boolean));
  }
  return result.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function collectChangedFiles(range: string): string[] {
  const changed = new Set<string>();
  for (const filePath of diffFiles(range)) {
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
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)) {
      changed.add(filePath);
    }
  }
  return [...changed].sort();
}

function diffNameStatusWithWorktree(range: string, extra: string[] = []): string[] {
  const entries = new Set(diffNameStatus(range, extra));
  for (const args of [
    ['diff', '--name-status', ...extra],
    ['diff', '--name-status', '--cached', ...extra],
  ]) {
    const result = runTool('git', args);
    if (result.exitCode !== 0) {
      guardrailFail('Unable to compute working tree migration diff', [
        result.stderr.trim(),
        result.stdout.trim(),
      ].filter(Boolean));
    }
    for (const line of result.stdout
      .split('\n')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)) {
      entries.add(line);
    }
  }
  return [...entries].sort();
}

function diffNameStatus(range: string, extra: string[] = []): string[] {
  const args = ['diff', '--name-status', range, ...extra];
  const result = runTool('git', args);
  if (result.exitCode !== 0) {
    guardrailFail(`Unable to compute diff for ${range}`, [result.stderr.trim(), result.stdout.trim()].filter(Boolean));
  }
  return result.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function dirExistsInCommit(commit: string, dir: string): boolean {
  const result = runTool('git', ['cat-file', '-e', `${commit}:${dir}`]);
  return result.exitCode === 0;
}

function loadManifest(): z.infer<typeof ManifestSchema> {
  if (!fs.existsSync(MANIFEST_PATH)) {
    guardrailFail(`Missing schema manifest at ${MANIFEST_PATH}`);
  }
  let raw: unknown;
  try {
    raw = readJsonFile(MANIFEST_PATH);
  } catch (error: unknown) {
    guardrailFail('Invalid schema manifest JSON', [
      error instanceof Error ? error.message : String(error),
    ]);
  }
  const parsed = ManifestSchema.safeParse(raw);
  if (!parsed.success) {
    const [issue] = parsed.error.issues;
    const message = issue?.message ?? parsed.error.message;
    guardrailFail('Invalid schema manifest', [message]);
  }
  return parsed.data;
}

function listMigrationDirs(): string[] {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    guardrailFail('Missing prisma/migrations directory');
  }
  return fs
    .readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => name !== 'migration_lock.toml')
    .sort();
}

function assertMigrationNames(dirs: string[]): void {
  const pattern = /^\d{14}_.+/;
  const invalid = dirs.filter((dir) => !pattern.test(dir));
  if (invalid.length > 0) {
    guardrailFail('Invalid migration folder name(s)', invalid.map((dir) => `prisma/migrations/${dir}`));
  }
}

function enforceNoOldMigrationEdits(range: string, base: string): void {
  const entries = diffNameStatusWithWorktree(range, ['--', 'prisma/migrations']);
  const violations: string[] = [];
  for (const line of entries) {
    const parts = line.split(/\\s+/);
    const status = parts[0];
    const filePath = parts.at(-1);
    if (status === undefined || filePath === undefined) continue;
    const segments = filePath.split('/');
    const dir = segments.length > 2 ? segments.slice(0, 3).join('/') : '';
    if (dir.length === 0) continue;
    const existed = dirExistsInCommit(base, dir);
    if (existed) {
      violations.push(`${filePath}:1:1: migration-edit-forbidden`);
    }
  }
  if (violations.length > 0) {
    guardrailFail('Edits to existing migrations are forbidden', violations);
  }
}

function assertEnvChecks(): void {
  if (!fs.existsSync(ENV_CHECKS_PATH)) {
    guardrailFail('Missing env-checks workflow', [path.relative(ROOT, ENV_CHECKS_PATH)]);
  }
  const content = fs.readFileSync(ENV_CHECKS_PATH, 'utf8');
  if (!content.includes('prisma generate')) {
    guardrailFail('env-checks workflow must run prisma generate', [path.relative(ROOT, ENV_CHECKS_PATH)]);
  }
  if (!content.includes('test:db')) {
    guardrailFail('env-checks workflow must run test:db', [path.relative(ROOT, ENV_CHECKS_PATH)]);
  }
}

function main(): void {
  const base = resolveBaseRef();
  const range = `${base}...HEAD`;
  const changed = collectChangedFiles(range);
  const schemaTouched = changed.some((filePath) =>
    filePath === 'prisma/schema.prisma' || filePath.startsWith('prisma/migrations/'),
  );

  const manifest = loadManifest();
  const migrationDirs = listMigrationDirs();
  assertMigrationNames(migrationDirs);
  const latestMigration = migrationDirs.at(-1);
  if (latestMigration === undefined) {
    guardrailFail('No migration folders found');
  }

  if (manifest.lastMigration !== latestMigration) {
    guardrailFail('schema manifest lastMigration mismatch', [
      `manifest=${manifest.lastMigration}`,
      `latest=${latestMigration}`,
    ]);
  }

  if (schemaTouched) {
    if (!changed.includes(path.relative(ROOT, MANIFEST_PATH))) {
      guardrailFail('Schema changes require manifest update', [path.relative(ROOT, MANIFEST_PATH)]);
    }
    if (!changed.includes(path.relative(ROOT, DOC_PATH))) {
      guardrailFail('Schema changes require docs/schema-evolution.md update', [
        path.relative(ROOT, DOC_PATH),
      ]);
    }
    if (changed.includes('scripts/guardrails/registry.mts') || changed.includes('package.json')) {
      if (!changed.includes(path.relative(ROOT, CONFIG_SNAPSHOT_PATH))) {
        guardrailFail('Registry or package.json changes require docs/config-snapshot.md sync', [
          path.relative(ROOT, CONFIG_SNAPSHOT_PATH),
        ]);
      }
    }
    enforceNoOldMigrationEdits(range, base);
    assertEnvChecks();
  }

  process.stdout.write('check:schema-evolution: ok\\n');
}

main();
