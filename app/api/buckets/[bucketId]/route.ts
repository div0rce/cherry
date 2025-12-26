import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { BucketPeriod, RewardCategory } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/logger';
import { BucketUpdateSchema } from '@/lib/schemas/buckets';
import { parseJsonBody } from '@/lib/validation';
import { computeBucketBalanceFromNumbers, deriveLegacyCurrentAmount, toBucketRuntime } from '@/lib/buckets-runtime';
import {
  assertUserId,
  isPrismaP2003,
  logInvariant,
  resolveUserContext,
} from '@/lib/user-context';
import { asError, asLogMeta } from '@/lib/errors';

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ bucketId: string }> }
): Promise<NextResponse> {
  let userId: string | null = null;
  let mode: string | null = null;

  try {
    const ctx = await resolveUserContext({
      requireAuth: true,
      allowLabDemo: false,
    });
    userId = ctx.userId;
    mode = ctx.mode;
  } catch (error) {
    asError(error);
    if (error.message.startsWith('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    logError('Error resolving user context in api/buckets/[bucketId] PATCH', error);
    return new NextResponse('Failed to resolve user context', { status: 500 });
  }

  const { bucketId } = await params;

  if (typeof bucketId !== 'string' || bucketId.length === 0) {
    return new NextResponse('bucketId is required', { status: 400 });
  }

  try {
    assertUserId(userId, 'api/buckets/[bucketId] PATCH');
    const parsed = await parseJsonBody(request, BucketUpdateSchema);
    if (!parsed.ok) return parsed.response;

    const bucket = await prisma.bucket.findFirst({
      where: { id: bucketId, userId },
    });
    if (!bucket) {
      return new NextResponse('Bucket not found for user', { status: 404 });
    }

    const now = new Date(parsed.data.nowMs);
    const { start: periodStart, end: periodEnd } = getPeriodWindow(parsed.data.period as BucketPeriod, now);
    const limitCents = Math.floor(parsed.data.budgetAmountCents);
    const postedSpendCents = Math.max(0, Math.floor(bucket.spentCents));
    const balance = computeBucketBalanceFromNumbers(limitCents, postedSpendCents, 0);

    const updated = await prisma.bucket.update({
      where: { id: bucket.id },
      data: {
        name: parsed.data.name.trim(),
        period: parsed.data.period as BucketPeriod,
        budgetAmount: limitCents,
        currentAmount: deriveLegacyCurrentAmount(balance),
        spentCents: balance.postedSpendCents,
        periodStart,
        periodEnd,
        category: parsed.data.category.trim().toUpperCase() as RewardCategory,
      },
    });

    return NextResponse.json(toBucketRuntime(updated));
  } catch (error) {
    asError(error);
    if (isPrismaP2003(error)) {
      logInvariant('P2003 in api/buckets/[bucketId] PATCH', {
        userId,
        mode,
        meta: asLogMeta(error.meta),
        err: error,
      });
    } else {
      logInvariant('Error in api/buckets/[bucketId] PATCH', { userId, mode, err: error });
      logError('Error updating bucket', error);
    }
    return new NextResponse('Failed to update bucket', { status: 500 });
  }
}

/**
 * DELETE /api/buckets/[bucketId]
 *
 * Validates ownership (demo user) and deletes the bucket.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ bucketId: string }> }
): Promise<NextResponse> {
  let userId: string | null = null;
  let mode: string | null = null;

  try {
    const ctx = await resolveUserContext({
      requireAuth: true,
      allowLabDemo: false,
    });
    userId = ctx.userId;
    mode = ctx.mode;
  } catch (error) {
    asError(error);
    if (error.message.startsWith('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    logError('Error resolving user context in api/buckets/[bucketId] DELETE', error);
    return new NextResponse('Failed to resolve user context', { status: 500 });
  }

  const { bucketId } = await params;

  if (
    bucketId === undefined ||
    bucketId === null ||
    typeof bucketId !== 'string' ||
    bucketId === ''
  ) {
    return new NextResponse('bucketId is required', { status: 400 });
  }

  const bucket = await prisma.bucket.findFirst({
    where: { id: bucketId, userId },
  });
  if (!bucket) {
    return new NextResponse('Bucket not found for user', { status: 404 });
  }

  try {
    assertUserId(userId, 'api/buckets/[bucketId] DELETE');
    await prisma.bucket.deleteMany({
      where: { id: bucket.id, userId },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    asError(error);
    if (isPrismaP2003(error)) {
      logInvariant('P2003 in api/buckets/[bucketId] DELETE', {
        userId,
        mode,
        meta: asLogMeta(error.meta),
        err: error,
      });
    } else {
      logInvariant('Error in api/buckets/[bucketId] DELETE', { userId, mode, err: error });
      logError('Error deleting bucket', error);
    }
    return new NextResponse('Failed to delete bucket', { status: 500 });
  }
}
