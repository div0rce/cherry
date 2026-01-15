import * as assert from 'node:assert/strict';
import { Prisma } from '@prisma/client';

export type PrismaRequestError =
  | Prisma.PrismaClientKnownRequestError
  | Prisma.PrismaClientUnknownRequestError;

export function assertPrismaError(error: unknown): asserts error is PrismaRequestError {
  assert.ok(error instanceof Error, 'expected Prisma error');
  if (error instanceof Prisma.PrismaClientKnownRequestError) return;
  if (error instanceof Prisma.PrismaClientUnknownRequestError) return;
  throw new Error(`Expected Prisma request error, got ${String(error)}`);
}

export function getPrismaMetaString(
  error: Prisma.PrismaClientKnownRequestError,
  key: 'constraint' | 'field_name' | 'code'
): string | undefined {
  const meta = error.meta;
  if (meta === undefined || meta === null) return undefined;
  if (typeof meta !== 'object') return undefined;
  const value = (meta as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : undefined;
}
