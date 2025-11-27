import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { BucketPeriod, RewardCategory } from '@prisma/client';
import { withUser } from '@/lib/with-user';
import { logError } from '@/lib/logger';

function getPeriodWindow(period: BucketPeriod, now: Date): { start: Date; end: Date } {
  const start = new Date(now);
  const end = new Date(now);

  if (period === 'WEEKLY') {
    const day = start.getDay();
    const diffToMonday = (day + 6) % 7;
    start.setDate(start.getDate() - diffToMonday);
    start.setHours(0, 0, 0, 0);

    end.setDate(start.getDate() + 7);
    end.setHours(0, 0, 0, 0);
  } else {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    end.setMonth(start.getMonth() + 1);
    end.setDate(1);
    end.setHours(0, 0, 0, 0);
  }

  return { start, end };
}

/**
 * GET /api/buckets
 *
 * Lists all buckets for the current user (demo user for now).
 */
export async function GET(request: Request) {
  return withUser(request, async (userId) => {
    try {
      const buckets = await prisma.bucket.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json(buckets);
    } catch (error) {
      logError('Error fetching buckets', error);
      return new NextResponse('Failed to fetch buckets', { status: 500 });
    }
  });
}

/**
 * POST /api/buckets
 *
 * Creates a new bucket for the current user.
 * Expects JSON body:
 * {
 *   name: string,
 *   period: "WEEKLY" | "MONTHLY",
 *   budgetAmountCents: number,
 *   strictMode?: boolean,
 *   category: string
 * }
 */
export async function POST(request: Request) {
  return withUser(request, async (userId) => {
    try {
      const body = await request.json();

      const {
        name,
        period,
        budgetAmountCents,
        currentAmountCents,
        strictMode = true,
        category,
      } = body ?? {};

      if (!name || !period || budgetAmountCents == null || !category) {
        return new NextResponse(
          'Missing required fields: name, period, budgetAmountCents, category',
          { status: 400 }
        );
      }

      if (typeof budgetAmountCents !== 'number' || budgetAmountCents <= 0) {
        return new NextResponse('budgetAmountCents must be a positive number', {
          status: 400,
        });
      }

      if (
        currentAmountCents != null &&
        (typeof currentAmountCents !== 'number' || currentAmountCents < 0)
      ) {
        return new NextResponse(
          'currentAmountCents must be a non-negative number when provided',
          { status: 400 }
        );
      }

      const validPeriods: BucketPeriod[] = [BucketPeriod.WEEKLY, BucketPeriod.MONTHLY];
      if (!validPeriods.includes(period as BucketPeriod)) {
        return new NextResponse(
          `Invalid period. Expected one of: ${validPeriods.join(', ')}`,
          { status: 400 }
        );
      }

      const validCategories = Object.values(RewardCategory) as string[];
      const normalizedCategory = String(category).toUpperCase();
      if (!validCategories.includes(normalizedCategory)) {
        return new NextResponse(
          `Invalid category. Expected one of: ${validCategories.join(', ')}`,
          { status: 400 }
        );
      }

      const now = new Date();
      const { start: periodStart, end: periodEnd } = getPeriodWindow(period as BucketPeriod, now);

      const bucket = await prisma.bucket.create({
        data: {
          userId,
          name,
          period: period as BucketPeriod,
          budgetAmount: Math.floor(budgetAmountCents),
          currentAmount:
            currentAmountCents == null
              ? Math.floor(budgetAmountCents)
              : Math.min(Math.floor(currentAmountCents), Math.floor(budgetAmountCents)),
          spentCents:
            currentAmountCents == null
              ? 0
              : Math.max(Math.floor(budgetAmountCents) - Math.floor(currentAmountCents), 0),
          periodStart,
          periodEnd,
          strictMode: Boolean(strictMode),
          category: normalizedCategory as RewardCategory,
        },
      });

      return NextResponse.json(bucket, { status: 201 });
    } catch (error) {
      logError('Error creating bucket', error);
      return new NextResponse('Failed to create bucket', { status: 500 });
    }
  });
}

/**
 * DELETE /api/buckets
 *
 * Legacy delete endpoint using body { bucketId }. Prefer /api/buckets/[bucketId].
 */
export async function DELETE(request: Request) {
  return withUser(request, async (userId) => {
    try {
      const body = await request.json();
      const { bucketId } = body ?? {};

      if (!bucketId || typeof bucketId !== 'string') {
        return new NextResponse('bucketId is required', { status: 400 });
      }

      const bucket = await prisma.bucket.findFirst({
        where: { id: bucketId, userId },
      });
      if (!bucket) {
        return new NextResponse('Bucket not found for user', { status: 404 });
      }

      await prisma.bucket.delete({
        where: { id: bucket.id },
      });

      return new NextResponse(null, { status: 204 });
    } catch (error) {
      logError('Error deleting bucket', error);
      return new NextResponse('Failed to delete bucket', { status: 500 });
    }
  });
}
