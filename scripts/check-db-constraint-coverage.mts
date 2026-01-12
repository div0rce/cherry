import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { asMessage } from './guardrails/lib/error.mjs';
import { fail } from './guardrails/lib/fail.mjs';
import { runTool } from './guardrails/lib/run-tool.mjs';

ensureTsEsm();

const PREFIX = 'check:db-constraint-coverage';
const FIX = 'Add a DB constraint test under tests/db/constraints that references the constraint.';
const ROOT = process.cwd();
const MIGRATIONS_DIR = path.join(ROOT, 'prisma', 'migrations');
const TEST_GLOB = 'tests/db/constraints/**/*.test.{ts,js}';

const CONSTRAINT_CODES = new Map<string, string>([
  ['UNIQUE', 'P2002'],
  ['FOREIGN_KEY', 'P2003'],
  ['CHECK', 'P2004'],
  ['NOT_NULL', '23502'],
]);

const CODE_TOKENS = ['P2002', 'P2003', 'P2004', '23502', '23514'];

type ConstraintType = 'UNIQUE' | 'FOREIGN_KEY' | 'CHECK' | 'NOT_NULL';

type Constraint = {
  id: string;
  type: ConstraintType;
  name?: string;
  table?: string;
  columns?: string[];
  source: string;
  line: number;
};

function normalizePath(target: string): string {
  return target.replace(/\\/g, '/');
}

function hashConstraint(table: string, columns: string[], type: ConstraintType): string {
  const input = `${table}|${columns.join(',')}|${type}`;
  return crypto.createHash('sha256').update(input).digest('hex').slice(0, 12);
}

function addConstraint(store: Map<string, Constraint>, constraint: Constraint): void {
  if (!store.has(constraint.id)) {
    store.set(constraint.id, constraint);
  }
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

function parseMigrationFile(filePath: string, store: Map<string, Constraint>): void {
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/);
  const relPath = normalizePath(path.relative(ROOT, filePath));
  let currentCreateTable: string | null = null;
  let currentAlterTable: string | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    const trimmed = line.trim();
    const lineNumber = index + 1;

    const createTableMatch = trimmed.match(/^CREATE TABLE\s+"([^"]+)"/);
    if (createTableMatch !== null) {
      currentCreateTable = createTableMatch[1] ?? null;
      continue;
    }

    if (currentCreateTable !== null) {
      if (trimmed.startsWith(');')) {
        currentCreateTable = null;
        continue;
      }
      const columnMatch = trimmed.match(/^"([^"]+)"\s+/);
      if (
        columnMatch !== null &&
        trimmed.includes('NOT NULL') &&
        trimmed.includes('DROP NOT NULL') === false
      ) {
        const column = columnMatch[1] ?? '';
        const table = currentCreateTable;
        const id = `NOT_NULL:${hashConstraint(table, [column], 'NOT_NULL')}`;
        addConstraint(store, {
          id,
          type: 'NOT_NULL',
          table,
          columns: [column],
          source: relPath,
          line: lineNumber,
        });
      }
      continue;
    }

    const alterMatch = trimmed.match(/^ALTER TABLE\s+"([^"]+)"/);
    if (alterMatch !== null) {
      currentAlterTable = alterMatch[1] ?? null;
    }

    const uniqueIndexMatch = trimmed.match(/^CREATE UNIQUE INDEX\s+"([^"]+)"/);
    if (uniqueIndexMatch !== null) {
      const name = uniqueIndexMatch[1] ?? '';
      addConstraint(store, {
        id: `UNIQUE:${name}`,
        type: 'UNIQUE',
        name,
        source: relPath,
        line: lineNumber,
      });
    }

    const addConstraintMatch = trimmed.match(/ADD CONSTRAINT\s+"([^"]+)"/);
    if (addConstraintMatch !== null) {
      const name = addConstraintMatch[1] ?? '';
      const table = alterMatch?.[1] ?? currentAlterTable ?? undefined;
      if (trimmed.includes('FOREIGN KEY')) {
        const constraint: Constraint = {
          id: `FOREIGN_KEY:${name}`,
          type: 'FOREIGN_KEY',
          name,
          source: relPath,
          line: lineNumber,
          ...(table === undefined ? {} : { table }),
        };
        addConstraint(store, constraint);
      } else if (trimmed.includes('CHECK')) {
        const constraint: Constraint = {
          id: `CHECK:${name}`,
          type: 'CHECK',
          name,
          source: relPath,
          line: lineNumber,
          ...(table === undefined ? {} : { table }),
        };
        addConstraint(store, constraint);
      } else if (trimmed.includes('UNIQUE')) {
        const constraint: Constraint = {
          id: `UNIQUE:${name}`,
          type: 'UNIQUE',
          name,
          source: relPath,
          line: lineNumber,
          ...(table === undefined ? {} : { table }),
        };
        addConstraint(store, constraint);
      }
    }

    if (currentAlterTable !== null) {
      const addColumnMatch = trimmed.match(/ADD COLUMN\s+"([^"]+)"/i);
      const alterColumnMatch = trimmed.match(/ALTER COLUMN\s+"([^"]+)"/i);
      const column = addColumnMatch?.[1] ?? alterColumnMatch?.[1];
      if (
        column !== undefined &&
        trimmed.includes('NOT NULL') &&
        trimmed.includes('DROP NOT NULL') === false
      ) {
        const id = `NOT_NULL:${hashConstraint(currentAlterTable, [column], 'NOT_NULL')}`;
        addConstraint(store, {
          id,
          type: 'NOT_NULL',
          table: currentAlterTable,
          columns: [column],
          source: relPath,
          line: lineNumber,
        });
      }

      if (trimmed.includes(';')) {
        currentAlterTable = null;
      }
    }
  }
}

function collectConstraints(): Constraint[] {
  const store = new Map<string, Constraint>();
  const files = listMigrationFiles();
  for (const file of files) {
    parseMigrationFile(file, store);
  }
  return Array.from(store.values()).sort((a, b) => a.id.localeCompare(b.id));
}

function listTestFiles(): string[] {
  const result = runTool('rg', ['--files', '-g', TEST_GLOB, ROOT]);
  if (result.exitCode !== 0) {
    const stderr = result.stderr.trim();
    const stdout = result.stdout.trim();
    const detail = stderr.length > 0 ? stderr : stdout;
    fail(PREFIX, 'Failed to list DB constraint tests', {
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

function readTestContent(files: string[]): string {
  return files.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
}

function isConstraintCovered(constraint: Constraint, testContent: string): boolean {
  if (testContent.includes(constraint.id)) return true;
  if (constraint.name !== undefined && testContent.includes(constraint.name)) return true;
  return false;
}

function main(): void {
  const constraints = collectConstraints();
  if (constraints.length === 0) {
    fail(PREFIX, 'No constraints detected in migrations', { fix: FIX });
  }

  const testFiles = listTestFiles();
  if (testFiles.length === 0) {
    fail(PREFIX, 'No DB constraint tests found', {
      details: [TEST_GLOB],
      fix: FIX,
    });
  }

  const testContent = readTestContent(testFiles);
  const missing: string[] = [];

  for (const constraint of constraints) {
    if (isConstraintCovered(constraint, testContent)) continue;
    const code = CONSTRAINT_CODES.get(constraint.type);
    const codeHint = code !== undefined ? ` code=${code}` : '';
    const suggestion = `tests/db/constraints/${constraint.id
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')}.test.ts`;
    missing.push(
      `${constraint.source}:${constraint.line} ${constraint.id} type=${constraint.type}${codeHint} suggested=${suggestion}`
    );
  }

  const missingCodes = CODE_TOKENS.filter((token) => testContent.includes(token) === false);
  if (missingCodes.length > 0) {
    missing.push(`Missing constraint error codes in tests: ${missingCodes.join(', ')}`);
  }

  if (missing.length > 0) {
    fail(PREFIX, 'DB constraint coverage gaps detected', { details: missing, fix: FIX });
  }

  process.stdout.write('check:db-constraint-coverage: ok\n');
}

try {
  main();
} catch (error: unknown) {
  const message = asMessage(error);
  fail(PREFIX, `Guardrail crashed: ${message}`, { fix: FIX });
}
