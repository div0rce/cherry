// app/api/simulations/route.ts
// List simulation history for the current user. Useful for dashboards and
// debugging the engine outputs end-to-end.

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { TransactionStatus, RewardCategory, Prisma } from '@prisma/client';
import { logError } from '@/lib/logger';
import { resolveUserContext, assertUserId } from '@/lib/user-context';

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
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const pageParam = Number.parseInt(searchParams.get('page') || '1', 10);
    const pageSizeParam = Number.parseInt(searchParams.get('pageSize') || '10', 10);

    const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
    const pageSize =
      Number.isFinite(pageSizeParam) && pageSizeParam > 0 ? Math.min(pageSizeParam, 50) : 10;

    const where: Prisma.SimulatedTransactionWhereInput = { userId };
    if (status === TransactionStatus.APPROVED || status === TransactionStatus.DECLINED) {
      where.status = status;
    }
    if (category) {
      const normalizedCategory = category.toUpperCase();
      if ((Object.values(RewardCategory) as string[]).includes(normalizedCategory)) {
        where.resolvedCategory = normalizedCategory as RewardCategory;
      }
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
  } catch (error) {
    if (error instanceof Error && error.message?.includes('Unauthorized')) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    logError('Error fetching simulations', error);
    return new NextResponse('Failed to fetch simulations', { status: 500 });
  }
}
