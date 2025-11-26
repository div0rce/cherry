import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { BucketPeriod } from '@prisma/client';
import { withUser } from '@/lib/with-user';
import { logError } from '@/lib/logger';

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

      const normalizedCategory = String(category).toUpperCase();

      const bucket = await prisma.bucket.create({
        data: {
          userId,
          name,
          period: period as BucketPeriod,
          budgetAmount: budgetAmountCents,
          currentAmount:
            currentAmountCents == null
              ? budgetAmountCents
              : Math.min(currentAmountCents, budgetAmountCents),
          strictMode: Boolean(strictMode),
          category: normalizedCategory,
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
