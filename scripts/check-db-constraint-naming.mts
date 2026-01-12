import fs from 'node:fs';
import path from 'node:path';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { fail } from './guardrails/lib/fail.mjs';
import { runTool } from './guardrails/lib/run-tool.mjs';

ensureTsEsm();

const PREFIX = 'check:db-constraint-naming';
const FIX = 'Name constraints using {table}__{columns}__{type} with explicit CONSTRAINT names.';
const ROOT = process.cwd();
const MIGRATIONS_DIR = path.join(ROOT, 'prisma', 'migrations');
const ENFORCED_SINCE = '20260113000000';
const NAME_REGEX = /^[a-z0-9]+__(?:[a-z0-9]+_?)+__(unique|fk|check)$/i;

type ConstraintKind = 'unique' | 'fk' | 'check';

type Violation = {
  file: string;
  line: number;
  message: string;
  suggestion: string;
};

type SeenName = {
  file: string;
  line: number;
  enforced: boolean;
};

function normalizePath(target: string): string {
  return target.replace(/\\/g, '/');
}

function normalizeIdentifier(value: string): string {
  const withUnderscores = value.replace(/([a-z0-9])([A-Z])/g, '$1_$2');
  return withUnderscores
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

function buildSuggestion(table: string | undefined, columns: string[], kind: ConstraintKind): string {
  const tablePart = normalizeIdentifier(table ?? 'table');
  const columnPart =
    columns.length > 0 ? columns.map((col) => normalizeIdentifier(col)).join('_') : 'columns';
  return `${tablePart}__${columnPart}__${kind}`;
}

function listMigrationFiles(): string[] {
  const result = runTool('rg', ['--files', '-g', 'migration.sql', MIGRATIONS_DIR]);
  if (result.exitCode !== 0) {
    const stderr = result.stderr.trim();
    const stdout = result.stdout.trim();
    const detail = stderr.length > 0 ? stderr : stdout;
    fail(PREFIX, 'Failed to list migration.sql files', {
      details: [detail].filter((item) => item.length > 0),
      fix: FIX,
    });
  }
  return result.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((file) => path.resolve(ROOT, file));
}

function migrationPrefix(filePath: string): string | null {
  const normalized = normalizePath(filePath);
  const match = normalized.match(/prisma\/migrations\/([^/]+)\/migration\.sql$/);
  if (match === null) return null;
  const dirName = match[1] ?? '';
  const prefixMatch = dirName.match(/^(\d{14})_/);
  return prefixMatch === null ? null : prefixMatch[1] ?? null;
}

function isEnforcedMigration(filePath: string): boolean {
  const prefix = migrationPrefix(filePath);
  if (prefix === null) return true;
  return prefix >= ENFORCED_SINCE;
}

function extractQuotedIdentifiers(input: string): string[] {
  const matches = input.match(/"([^"]+)"/g);
  if (matches === null) return [];
  return matches.map((item) => item.replace(/"/g, '')).filter((item) => item.length > 0);
}

function parseColumns(pattern: RegExp, line: string): string[] {
  const match = line.match(pattern);
  if (match === null) return [];
  const segment = match[1] ?? '';
  return extractQuotedIdentifiers(segment);
}

function inferKind(line: string): ConstraintKind | null {
  if (line.match(/\bFOREIGN KEY\b/i) !== null || line.match(/\bREFERENCES\b/i) !== null) {
    return 'fk';
  }
  if (line.match(/\bCHECK\b/i) !== null) return 'check';
  if (line.match(/\bUNIQUE\b/i) !== null) return 'unique';
  return null;
}

function inferColumns(kind: ConstraintKind, line: string): string[] {
  if (kind === 'fk') {
    const columns = parseColumns(/FOREIGN KEY\s*\(([^)]+)\)/i, line);
    if (columns.length > 0) return columns;
    const columnMatch = line.match(/^"([^"]+)"/);
    if (columnMatch !== null) return [columnMatch[1] ?? ''];
    return [];
  }
  if (kind === 'unique') {
    const columns = parseColumns(/UNIQUE\s*\(([^)]+)\)/i, line);
    if (columns.length > 0) return columns;
    const columnMatch = line.match(/^"([^"]+)"/);
    if (columnMatch !== null) return [columnMatch[1] ?? ''];
    return [];
  }
  const columns = parseColumns(/CHECK\s*\((.+)\)/i, line);
  if (columns.length > 0) return columns;
  const columnMatch = line.match(/^"([^"]+)"/);
  if (columnMatch !== null) return [columnMatch[1] ?? ''];
  return [];
}

function isNameValid(name: string, kind: ConstraintKind): boolean {
  if (NAME_REGEX.test(name) === false) return false;
  return name.toLowerCase().endsWith(`__${kind}`);
}

function recordViolation(
  violations: Violation[],
  file: string,
  line: number,
  message: string,
  suggestion: string
): void {
  violations.push({ file, line, message, suggestion });
}

function recordName(
  seenNames: Map<string, SeenName>,
  violations: Violation[],
  name: string,
  enforced: boolean,
  file: string,
  line: number,
  suggestion: string
): void {
  const existing = seenNames.get(name);
  if (existing !== undefined) {
    if (enforced) {
      recordViolation(
        violations,
        file,
        line,
        `Duplicate constraint name "${name}" (first seen at ${existing.file}:${existing.line})`,
        suggestion
      );
    }
    return;
  }
  seenNames.set(name, { file, line, enforced });
}

function parseMigration(
  filePath: string,
  violations: Violation[],
  seenNames: Map<string, SeenName>
): void {
  const enforced = isEnforcedMigration(filePath);
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/);
  const relPath = normalizePath(path.relative(ROOT, filePath));
  let currentCreateTable: string | null = null;
  let currentAlterTable: string | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    const lineNumber = index + 1;

    const createTableMatch = trimmed.match(/^CREATE TABLE\s+"([^"]+)"/i);
    if (createTableMatch !== null) {
      currentCreateTable = createTableMatch[1] ?? null;
      continue;
    }

    if (currentCreateTable !== null && trimmed.startsWith(');')) {
      currentCreateTable = null;
      continue;
    }

    const alterMatch = trimmed.match(/^ALTER TABLE\s+"([^"]+)"/i);
    if (alterMatch !== null) {
      currentAlterTable = alterMatch[1] ?? null;
    }

    const uniqueIndexMatch = trimmed.match(/^CREATE UNIQUE INDEX\s+"([^"]+)"/i);
    if (uniqueIndexMatch !== null) {
      const name = uniqueIndexMatch[1] ?? '';
      const tableMatch = trimmed.match(/ON\s+"([^"]+)"/i);
      const table = tableMatch === null ? undefined : tableMatch[1];
      const columns = parseColumns(/\(([^)]+)\)/, trimmed);
      const suggestion = buildSuggestion(table, columns, 'unique');
      if (isNameValid(name, 'unique') === false && enforced) {
        recordViolation(
          violations,
          relPath,
          lineNumber,
          `Unique index name "${name}" does not match naming format`,
          suggestion
        );
      }
      recordName(seenNames, violations, name, enforced, relPath, lineNumber, suggestion);
      continue;
    }

    const namedConstraintMatch = trimmed.match(/CONSTRAINT\s+"([^"]+)"/i);
    if (namedConstraintMatch !== null) {
      const name = namedConstraintMatch[1] ?? '';
      const kind = inferKind(trimmed);
      if (kind !== null) {
        const table = alterMatch?.[1] ?? currentAlterTable ?? currentCreateTable ?? undefined;
        const columns = inferColumns(kind, trimmed);
        const suggestion = buildSuggestion(table, columns, kind);
        if (isNameValid(name, kind) === false && enforced) {
          recordViolation(
            violations,
            relPath,
            lineNumber,
            `Constraint name "${name}" does not match naming format`,
            suggestion
          );
        }
        recordName(seenNames, violations, name, enforced, relPath, lineNumber, suggestion);
      }
      continue;
    }

    if (trimmed.match(/\bCREATE UNIQUE INDEX\b/i) !== null) {
      if (enforced) {
        recordViolation(
          violations,
          relPath,
          lineNumber,
          'Unique index is missing an explicit name',
          buildSuggestion(currentAlterTable ?? currentCreateTable ?? undefined, [], 'unique')
        );
      }
      continue;
    }

    if (trimmed.match(/\bADD CONSTRAINT\b/i) !== null) {
      const kind = inferKind(trimmed);
      if (kind !== null) {
        if (enforced) {
          const table = alterMatch?.[1] ?? currentAlterTable ?? currentCreateTable ?? undefined;
          const columns = inferColumns(kind, trimmed);
          recordViolation(
            violations,
            relPath,
            lineNumber,
            'Constraint is missing an explicit name',
            buildSuggestion(table, columns, kind)
          );
        }
      }
      continue;
    }

    if (trimmed.includes('CONSTRAINT')) continue;

    const unnamedKind = inferKind(trimmed);
    if (unnamedKind !== null) {
      if (enforced) {
        const table = currentAlterTable ?? currentCreateTable ?? undefined;
        const columns = inferColumns(unnamedKind, trimmed);
        recordViolation(
          violations,
          relPath,
          lineNumber,
          `Constraint is missing an explicit name for ${unnamedKind.toUpperCase()}`,
          buildSuggestion(table, columns, unnamedKind)
        );
      }
    }

    if (currentAlterTable !== null && trimmed.includes(';')) {
      currentAlterTable = null;
    }
  }
}

function main(): void {
  const violations: Violation[] = [];
  const seenNames = new Map<string, SeenName>();
  const files = listMigrationFiles();
  for (const file of files) {
    parseMigration(file, violations, seenNames);
  }

  if (violations.length > 0) {
    const details = violations.map(
      (item) =>
        `${item.file}:${item.line} ${item.message} suggested=${item.suggestion}`
    );
    fail(PREFIX, 'DB constraint naming violations detected', { details, fix: FIX });
  }

  process.stdout.write('check:db-constraint-naming: ok\n');
}

main();
