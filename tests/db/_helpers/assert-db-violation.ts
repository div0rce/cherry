import * as assert from 'node:assert/strict';

type DbViolationKind = 'unique' | 'foreign_key' | 'check' | 'not_null';

const SQLSTATE_BY_KIND: Record<DbViolationKind, string> = {
  unique: '23505',
  foreign_key: '23503',
  check: '23514',
  not_null: '23502',
};

function extractMessage(error: Error): string {
  return error.message;
}

function matchesConstraint(message: string, constraints: readonly string[]): boolean {
  return constraints.some((constraint) => message.includes(constraint));
}

export function assertDbViolation(
  error: unknown,
  kind: DbViolationKind,
  constraints: readonly string[] = []
): asserts error is Error {
  assert.ok(error instanceof Error, 'expected error');
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
): asserts error is Error {
  assertDbViolation(error, 'unique', constraints);
}

export function assertForeignKeyViolation(
  error: unknown,
  constraints: readonly string[] = []
): asserts error is Error {
  assertDbViolation(error, 'foreign_key', constraints);
}

export function assertCheckViolation(
  error: unknown,
  constraints: readonly string[] = []
): asserts error is Error {
  assertDbViolation(error, 'check', constraints);
}

export function assertNotNullViolation(
  error: unknown,
  constraints: readonly string[] = []
): asserts error is Error {
  assertDbViolation(error, 'not_null', constraints);
}
