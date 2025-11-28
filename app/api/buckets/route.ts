import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { BucketPeriod, RewardCategory } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { withUser } from '@/lib/with-user';
import { logError } from '@/lib/logger';
import { BucketCreateSchema, BucketDeleteSchema } from '@/lib/schemas/buckets';
import { parseJsonBody } from '@/lib/validation';
import { ensureUser } from '@/lib/ensure-user';

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
export async function GET(request: NextRequest): Promise<NextResponse> {
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

export async function POST(request: NextRequest): Promise<NextResponse> {
  return withUser(request, async (userId) => {
    try {
      const parsed = await parseJsonBody(request, BucketCreateSchema);
      if (!parsed.ok) return parsed.response;
      const {
        name,
        period,
        budgetAmountCents,
        currentAmountCents,
        strictMode = true,
        category,
      } = parsed.data;

      if (
        typeof name !== 'string' ||
        typeof period !== 'string' ||
        budgetAmountCents == null ||
        typeof category !== 'string'
      ) {
        return new NextResponse(
          'Missing required fields: name, period, budgetAmountCents, category',
          { status: 400 }
        );
      }

      const normalizedName = name.trim();
      const normalizedCategory = category.trim().toUpperCase();

      if (!normalizedName) {
        return new NextResponse('name is required', { status: 400 });
      }

      if (typeof budgetAmountCents !== 'number' || Number.isNaN(budgetAmountCents) || budgetAmountCents <= 0) {
        return new NextResponse('budgetAmountCents must be a positive number', {
          status: 400,
        });
      }

      let currentCentsValue: number | null = null;
      if (
        currentAmountCents != null &&
        (typeof currentAmountCents !== 'number' || Number.isNaN(currentAmountCents) || currentAmountCents < 0)
      ) {
        return new NextResponse(
          'currentAmountCents must be a non-negative number when provided',
          { status: 400 }
        );
      } else if (typeof currentAmountCents === 'number') {
        currentCentsValue = Math.floor(currentAmountCents);
      }

      const validPeriods: BucketPeriod[] = [BucketPeriod.WEEKLY, BucketPeriod.MONTHLY];
      if (!validPeriods.includes(period as BucketPeriod)) {
        return new NextResponse(
          `Invalid period. Expected one of: ${validPeriods.join(', ')}`,
          { status: 400 }
        );
      }

      const validCategories = Object.values(RewardCategory) as string[];
      if (!validCategories.includes(normalizedCategory)) {
        return new NextResponse(
          `Invalid category. Expected one of: ${validCategories.join(', ')}`,
          { status: 400 }
        );
      }

      const now = new Date();
      const { start: periodStart, end: periodEnd } = getPeriodWindow(period as BucketPeriod, now);

      await ensureUser(userId);

      const bucket = await prisma.bucket.create({
        data: {
          userId,
          name: normalizedName,
          period: period as BucketPeriod,
          budgetAmount: Math.floor(budgetAmountCents),
          currentAmount:
            currentCentsValue == null
              ? Math.floor(budgetAmountCents)
              : Math.min(currentCentsValue, Math.floor(budgetAmountCents)),
          spentCents:
            currentCentsValue == null
              ? 0
              : Math.max(Math.floor(budgetAmountCents) - currentCentsValue, 0),
          periodStart,
          periodEnd,
          strictMode: Boolean(strictMode),
          category: normalizedCategory as RewardCategory,
        },
      });

      return NextResponse.json(bucket, { status: 201 });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2003') {
        logError('Bucket FK violation', error);
        return new NextResponse('User foreign key violation while creating bucket', {
          status: 500,
        });
      }
      logError('Error creating bucket', error);
      return new NextResponse('Failed to create bucket', { status: 500 });
    }
  });
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  return withUser(request, async (userId) => {
    try {
      const parsed = await parseJsonBody(request, BucketDeleteSchema);
      if (!parsed.ok) return parsed.response;
      const { bucketId } = parsed.data;

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
