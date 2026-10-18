import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { BucketPeriod, RewardCategory } from '@prisma/client';
import { prisma } from '../../../../lib/prisma.js';
import { logError } from '../../../../lib/logger.js';
import { BucketUpdateSchema } from '../../../../lib/schemas/buckets.js';
import { parseJsonBody } from '../../../../lib/validation.js';
import { computeBucketBalanceFromNumbers, deriveLegacyCurrentAmount, toBucketRuntime } from '../../../../lib/buckets-runtime.js';
import {
  assertUserId,
  isPrismaP2003,
  logInvariant,
  resolveUserContext,
} from '../../../../lib/user-context.js';
import { asAppError, isUnauthorized, asLogMeta } from '../../../../lib/errors.js';
import { auth } from '../../../../lib/auth.js';

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

type BucketUser = { userId: string; mode: string | null };

async function resolveBucketUser(verb: 'PATCH' | 'DELETE'): Promise<BucketUser | NextResponse> {
  try {
    const ctx = await resolveUserContext({
      getSession: auth,
      requireAuth: true,
      allowLabDemo: false,
    });
    return { userId: ctx.userId, mode: ctx.mode };
  } catch (error: unknown) {
    const appError = asAppError(error);
    if (isUnauthorized(appError)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    logError(`Error resolving user context in api/buckets/[bucketId] ${verb}`, appError);
    return new NextResponse('Failed to resolve user context', { status: 500 });
  }
}

function isBucketId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function logBucketFailure(
  error: unknown,
  verb: 'PATCH' | 'DELETE',
  { userId, mode }: BucketUser,
  message: string
): void {
  const appError = asAppError(error);
  if (isPrismaP2003(error)) {
    logInvariant(`P2003 in api/buckets/[bucketId] ${verb}`, {
      userId,
      mode,
      meta: asLogMeta(error.meta),
      err: error,
    });
    return;
  }
  logInvariant(`Error in api/buckets/[bucketId] ${verb}`, { userId, mode, err: appError });
  logError(message, appError);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ bucketId: string }> }
): Promise<NextResponse> {
  const ctx = await resolveBucketUser('PATCH');
  if (ctx instanceof NextResponse) return ctx;
  const { userId, mode } = ctx;

  const { bucketId } = await params;

  if (!isBucketId(bucketId)) {
    return new NextResponse('bucketId is required', { status: 400 });
  }

  try {
    assertUserId(userId, 'api/buckets/[bucketId] PATCH');
    const parsed = await parseJsonBody(request, BucketUpdateSchema);
    if (parsed.ok !== true) return parsed.response;

    const bucket = await prisma.bucket.findFirst({
      where: { id: bucketId, userId },
    });
    if (bucket === null) {
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
  } catch (error: unknown) {
    logBucketFailure(error, 'PATCH', { userId, mode }, 'Error updating bucket');
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
  const ctx = await resolveBucketUser('DELETE');
  if (ctx instanceof NextResponse) return ctx;
  const { userId, mode } = ctx;

  const { bucketId } = await params;

  if (!isBucketId(bucketId)) {
    return new NextResponse('bucketId is required', { status: 400 });
  }

  const bucket = await prisma.bucket.findFirst({
    where: { id: bucketId, userId },
  });
  if (bucket === null) {
    return new NextResponse('Bucket not found for user', { status: 404 });
  }

  try {
    assertUserId(userId, 'api/buckets/[bucketId] DELETE');
    await prisma.bucket.deleteMany({
      where: { id: bucket.id, userId },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    logBucketFailure(error, 'DELETE', { userId, mode }, 'Error deleting bucket');
    return new NextResponse('Failed to delete bucket', { status: 500 });
  }
}
