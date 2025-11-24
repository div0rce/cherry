import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { BucketPeriod } from '@prisma/client';

// For now we hardcode a demo user. Later this becomes session.user.id from auth.
export const DEMO_USER_ID = 'demo-user-id';

export async function findBucketForUser(bucketId: string) {
  return prisma.bucket.findFirst({
    where: { id: bucketId, userId: DEMO_USER_ID },
  });
}

/**
 * GET /api/buckets
 *
 * Lists all buckets for the current user (demo user for now).
 */
export async function GET() {
  try {
    const buckets = await prisma.bucket.findMany({
      where: { userId: DEMO_USER_ID },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(buckets);
  } catch (error) {
    console.error('Error fetching buckets:', error);
    return new NextResponse('Failed to fetch buckets', { status: 500 });
  }
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

    // Basic validation – we keep this simple for now.
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
      return new NextResponse('currentAmountCents must be a non-negative number when provided', {
        status: 400,
      });
    }

    // Ensure period is one of the valid enum values.
    const validPeriods: BucketPeriod[] = [BucketPeriod.WEEKLY, BucketPeriod.MONTHLY];
    if (!validPeriods.includes(period as BucketPeriod)) {
      return new NextResponse(
        `Invalid period. Expected one of: ${validPeriods.join(', ')}`,
        { status: 400 }
      );
    }

    const normalizedCategory = String(category).toUpperCase();

    // Ensure the demo user exists. This mirrors what you do in /api/cards.
    const user = await prisma.user.upsert({
      where: { id: DEMO_USER_ID },
      update: {},
      create: {
        id: DEMO_USER_ID,
        email: 'demo@example.com',
        name: 'Demo User',
      },
    });

    const bucket = await prisma.bucket.create({
      data: {
        userId: user.id,
        name,
        period: period as BucketPeriod,
        budgetAmount: budgetAmountCents,
        currentAmount:
          currentAmountCents == null ? budgetAmountCents : Math.min(currentAmountCents, budgetAmountCents),
        strictMode: Boolean(strictMode),
        category: normalizedCategory,
      },
    });

    return NextResponse.json(bucket, { status: 201 });
  } catch (error) {
    console.error('Error creating bucket:', error);
    return new NextResponse('Failed to create bucket', { status: 500 });
  }
}

/**
 * DELETE /api/buckets
 *
 * Legacy delete endpoint using body { bucketId }. Prefer /api/buckets/[bucketId].
 */
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { bucketId } = body ?? {};

    if (!bucketId || typeof bucketId !== 'string') {
      return new NextResponse('bucketId is required', { status: 400 });
    }

    const bucket = await findBucketForUser(bucketId);
    if (!bucket) {
      return new NextResponse('Bucket not found for user', { status: 404 });
    }

    await prisma.bucket.delete({
      where: { id: bucket.id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting bucket:', error);
    return new NextResponse('Failed to delete bucket', { status: 500 });
  }
}
