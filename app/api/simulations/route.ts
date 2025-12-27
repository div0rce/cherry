// app/api/simulations/route.ts
// List simulation history for the current user. Useful for dashboards and
// debugging the engine outputs end-to-end.

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { TransactionStatus, RewardCategory, Prisma } from '@prisma/client';
import { logError } from '../../../lib/logger';
import { asAppError, isUnauthorized } from '../../../lib/errors';
import { resolveUserContext, assertUserId } from '../../../lib/user-context';
import { hasText } from '../../../lib/text';
import { logGuardrailEvent } from '../../../lib/log';

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
  try {
    const { userId } = await resolveUserContext({ requireAuth: false, allowLabDemo: true });
    assertUserId(userId, 'api/simulations GET');
    const { searchParams } = new URL(request.url);
    const statusRaw = searchParams.get('status');
    const categoryRaw = searchParams.get('category');
    const pageParamRaw = searchParams.get('page');
    const pageSizeRaw = searchParams.get('pageSize');

    const hasStatus = hasText(statusRaw);
    const hasCategory = hasText(categoryRaw);
    const parsedPage = Number.parseInt(hasText(pageParamRaw) ? pageParamRaw : '1', 10);
    const parsedPageSize = Number.parseInt(hasText(pageSizeRaw) ? pageSizeRaw : '10', 10);

    const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
    const pageSize =
      Number.isInteger(parsedPageSize) && parsedPageSize > 0
        ? Math.min(parsedPageSize, 50)
        : 10;

    if (hasText(pageParamRaw) && (Number.isNaN(parsedPage) || parsedPage <= 0)) {
      logGuardrailEvent({
        userId,
        surface: 'simulations',
        outcome: 'WARN',
        reason: 'INVALID_PAGE_FALLBACK',
      });
    }

    if (hasText(pageSizeRaw) && (Number.isNaN(parsedPageSize) || parsedPageSize <= 0)) {
      logGuardrailEvent({
        userId,
        surface: 'simulations',
        outcome: 'WARN',
        reason: 'INVALID_PAGE_SIZE_FALLBACK',
      });
    }

    const where: Prisma.SimulatedTransactionWhereInput = { userId };
    if (hasStatus) {
      const normalizedStatus = statusRaw?.toUpperCase();
      const statusValid =
        normalizedStatus === TransactionStatus.APPROVED ||
        normalizedStatus === TransactionStatus.DECLINED;
      if (!statusValid) {
        logGuardrailEvent({
          userId,
          surface: 'simulations',
          outcome: 'STOP',
          reason: 'INVALID_STATUS',
        });
        return new NextResponse('Invalid request', { status: 400 });
      }
      where.status = normalizedStatus as TransactionStatus;
    }

    if (hasCategory) {
      const normalizedCategory = categoryRaw?.toUpperCase() ?? '';
      const categoryValid = (Object.values(RewardCategory) as string[]).includes(
        normalizedCategory
      );
      if (!categoryValid) {
        logGuardrailEvent({
          userId,
          surface: 'simulations',
          outcome: 'STOP',
          reason: 'INVALID_CATEGORY',
        });
        return new NextResponse('Invalid request', { status: 400 });
      }
      where.resolvedCategory = normalizedCategory as RewardCategory;
    }

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
