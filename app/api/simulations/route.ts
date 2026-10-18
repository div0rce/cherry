// app/api/simulations/route.ts
// List simulation history for the current user. Useful for dashboards and
// debugging the engine outputs end-to-end.

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma.js';
import { TransactionStatus, RewardCategory, Prisma } from '@prisma/client';
import { logError } from '../../../lib/logger.js';
import { asAppError, isUnauthorized } from '../../../lib/errors.js';
import { resolveUserContext, assertUserId } from '../../../lib/user-context.js';
import { hasText } from '../../../lib/text.js';
import { logGuardrailEvent } from '../../../lib/log.js';
import { auth } from '../../../lib/auth.js';

type EventScope = { userId: string; requestTimestamp: string };

function logSimulationsEvent(scope: EventScope, outcome: 'WARN' | 'STOP', reason: string): void {
  logGuardrailEvent({
    userId: scope.userId,
    surface: 'simulations',
    outcome,
    reason,
    timestamp: scope.requestTimestamp,
    timestampSource: 'boundary',
  });
}

/**
 * Parse a positive integer query param. `invalid` is true only when a value
 * was supplied and could not be used.
 */
function parsePositiveInt(raw: string | null, fallback: string): { parsed: number; invalid: boolean } {
  const parsed = Number.parseInt(hasText(raw) ? raw : fallback, 10);
  const usable = Number.isInteger(parsed) && parsed > 0;
  return { parsed, invalid: hasText(raw) && !usable };
}

function readPagination(searchParams: URLSearchParams, scope: EventScope) {
  const pageParam = parsePositiveInt(searchParams.get('page'), '1');
  const pageSizeParam = parsePositiveInt(searchParams.get('pageSize'), '10');
  const page = pageParam.invalid ? 1 : pageParam.parsed;
  const pageSize = pageSizeParam.invalid ? 10 : Math.min(pageSizeParam.parsed, 50);

  if (pageParam.invalid) {
    logSimulationsEvent(scope, 'WARN', 'INVALID_PAGE_FALLBACK');
  }
  if (pageSizeParam.invalid) {
    logSimulationsEvent(scope, 'WARN', 'INVALID_PAGE_SIZE_FALLBACK');
  }
  return { page, pageSize };
}

function isValidStatus(normalizedStatus: string): boolean {
  return normalizedStatus === TransactionStatus.APPROVED || normalizedStatus === TransactionStatus.DECLINED;
}

function isValidCategory(normalizedCategory: string): boolean {
  return (Object.values(RewardCategory) as string[]).includes(normalizedCategory);
}

/**
 * Build the where-clause from status/category filters. Returns the guardrail
 * reason when a supplied filter is invalid.
 */
function buildWhere(
  searchParams: URLSearchParams,
  userId: string
): { ok: true; where: Prisma.SimulatedTransactionWhereInput } | { ok: false; reason: string } {
  const status = normalizeFilter(searchParams.get('status'), isValidStatus);
  if (!status.ok) return { ok: false, reason: 'INVALID_STATUS' };
  const category = normalizeFilter(searchParams.get('category'), isValidCategory);
  if (!category.ok) return { ok: false, reason: 'INVALID_CATEGORY' };

  const where: Prisma.SimulatedTransactionWhereInput = { userId };
  if (status.value !== undefined) where.status = status.value as TransactionStatus;
  if (category.value !== undefined) where.resolvedCategory = category.value as RewardCategory;
  return { ok: true, where };
}

/**
 * Upper-case an optional filter value. Absent is fine; present but invalid is not.
 */
function normalizeFilter(
  raw: string | null,
  isValid: (normalized: string) => boolean
): { ok: true; value: string | undefined } | { ok: false } {
  if (!hasText(raw)) return { ok: true, value: undefined };
  const normalized = raw.toUpperCase();
  return isValid(normalized) ? { ok: true, value: normalized } : { ok: false };
}

/**
 * GET /api/simulations
 *
 * Supports optional filtering and pagination via query params:
 * - status: "APPROVED" | "DECLINED"
 * - category: RewardCategory (string)
 * - page: number (1-based)
 * - pageSize: number (default 10, max 50)
 *
 * Returns shape: { data, total, page, pageSize }
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestTimestamp = new Date().toISOString();
  try {
    const { userId } = await resolveUserContext({
      getSession: auth,
      requireAuth: false,
      allowLabDemo: true,
    });
    assertUserId(userId, 'api/simulations GET');
    const scope: EventScope = { userId, requestTimestamp };
    const { searchParams } = new URL(request.url);
    const { page, pageSize } = readPagination(searchParams, scope);

    const filter = buildWhere(searchParams, userId);
    if (!filter.ok) {
      logSimulationsEvent(scope, 'STOP', filter.reason);
      return new NextResponse('Invalid request', { status: 400 });
    }
    const { where } = filter;

    const [total, data] = await prisma.$transaction([
      prisma.simulatedTransaction.count({ where }),
      prisma.simulatedTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          chosenCard: true,
          bucket: true,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return NextResponse.json({
      data,
      total,
      page,
      pageSize,
    });
  } catch (error: unknown) {
    const appError = asAppError(error);
    if (isUnauthorized(appError)) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    logError('Error fetching simulations', appError);
    return new NextResponse('Failed to fetch simulations', { status: 500 });
  }
}
