import * as assert from 'node:assert/strict';

type DbViolationKind = 'unique' | 'foreign_key' | 'check' | 'not_null';

const SQLSTATE_BY_KIND: Record<DbViolationKind, string> = {
  unique: '23505',
  foreign_key: '23503',
  check: '23514',
  not_null: '23502',
};

function extractMessage(error: unknown): string {
  if (error !== null && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (message !== undefined) {
      return String(message);
    }
  }
  return String(error);
}

function matchesConstraint(message: string, constraints: readonly string[]): boolean {
  return constraints.some((constraint) => message.includes(constraint));
}

export function assertDbViolation(
  error: unknown,
  kind: DbViolationKind,
  constraints: readonly string[] = []
): void {
  const message = extractMessage(error);
  const sqlState = SQLSTATE_BY_KIND[kind];
  const hasSqlState = message.includes(sqlState);
  const hasConstraint = matchesConstraint(message, constraints);
  assert.ok(
    hasSqlState || hasConstraint,
    `expected ${kind} violation (sqlstate ${sqlState})`
  );
}

export function assertUniqueViolation(
  error: unknown,
  constraints: readonly string[] = []
): void {
  assertDbViolation(error, 'unique', constraints);
}

export function assertForeignKeyViolation(
  error: unknown,
  constraints: readonly string[] = []
): void {
  assertDbViolation(error, 'foreign_key', constraints);
}

export function assertCheckViolation(
  error: unknown,
  constraints: readonly string[] = []
): void {
  assertDbViolation(error, 'check', constraints);
}

export function assertNotNullViolation(
  error: unknown,
  constraints: readonly string[] = []
): void {
  assertDbViolation(error, 'not_null', constraints);
}
