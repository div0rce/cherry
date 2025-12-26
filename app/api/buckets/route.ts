import { NextResponse, NextRequest } from 'next/server';
import { BucketPeriod, RewardCategory } from '@prisma/client';
import { prisma } from '../../../lib/prisma.js';
import { logError } from '../../../lib/logger.js';
import { BucketCreateSchema, BucketDeleteSchema } from '../../../lib/schemas/buckets.js';
import { parseJsonBody } from '../../../lib/validation.js';
import { computeBucketBalanceFromNumbers, deriveLegacyCurrentAmount, toBucketRuntime } from '../../../lib/buckets-runtime.js';
import {
  assertUserId,
  isPrismaP2003,
  logInvariant,
  resolveUserContext,
} from '../../../lib/user-context.js';
import { asAppError, isUnauthorized, asLogMeta } from '../../../lib/errors.js';

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

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
export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = await resolveUserContext({
      requireAuth: true,
      allowLabDemo: false,
    });
    assertUserId(userId, 'api/buckets GET');

    const buckets = await prisma.bucket.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const runtimeBuckets = buckets.map(toBucketRuntime);
    return NextResponse.json(runtimeBuckets);
  } catch (error: unknown) {
    const appError = asAppError(error);
    if (isUnauthorized(appError)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logError('Error fetching buckets', appError);
    return new NextResponse('Failed to fetch buckets', { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let userId: string | null = null;
  let mode: string | null = null;

  try {
    const ctx = await resolveUserContext({
      requireAuth: true,
      allowLabDemo: false,
    });
    userId = ctx.userId;
    mode = ctx.mode;
  } catch (error: unknown) {
    const appError = asAppError(error);
    if (isUnauthorized(appError)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    logError('Error resolving user context in api/buckets POST', appError);
    return new NextResponse('Failed to resolve user context', { status: 500 });
  }

  try {
    assertUserId(userId, 'api/buckets POST');
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

    const hasBudgetAmount =
      budgetAmountCents !== null && budgetAmountCents !== undefined && !Number.isNaN(budgetAmountCents);
    if (!isNonEmptyString(name) || !isNonEmptyString(period) || !hasBudgetAmount || !isNonEmptyString(category)) {
      return new NextResponse(
        'Missing required fields: name, period, budgetAmountCents, category',
        { status: 400 }
      );
    }

    const normalizedName = name.trim();
    const normalizedCategory = category.trim().toUpperCase();

    if (normalizedName === '') {
      return new NextResponse('name is required', { status: 400 });
    }

    if (typeof budgetAmountCents !== 'number' || Number.isNaN(budgetAmountCents) || budgetAmountCents <= 0) {
      return new NextResponse('budgetAmountCents must be a positive number', {
        status: 400,
      });
    }

    // currentAmount is legacy; only used here to seed spentCents on creation.
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
    const limitCents = Math.floor(budgetAmountCents);
    const postedSpendCents =
      currentCentsValue == null ? 0 : Math.max(limitCents - currentCentsValue, 0);
    const balance = computeBucketBalanceFromNumbers(limitCents, postedSpendCents, 0);

    const bucket = await prisma.bucket.create({
      data: {
        userId,
        name: normalizedName,
        period: period as BucketPeriod,
        budgetAmount: limitCents,
        currentAmount: deriveLegacyCurrentAmount(balance),
        spentCents: balance.postedSpendCents,
        periodStart,
        periodEnd,
        strictMode: Boolean(strictMode),
        category: normalizedCategory as RewardCategory,
      },
    });

    return NextResponse.json(toBucketRuntime(bucket), { status: 201 });
  } catch (error: unknown) {
    const appError = asAppError(error);
    if (isPrismaP2003(error)) {
      logInvariant('P2003 in api/buckets POST', {
        userId,
        mode,
        meta: asLogMeta(error.meta),
        err: error,
      });
    } else {
      logInvariant('Error in api/buckets POST', { userId, mode, err: appError });
      logError('Error creating bucket', appError);
    }
    return NextResponse.json(
      { error: 'Bucket create failed due to FK or user context' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  let userId: string | null = null;
  let mode: string | null = null;

  try {
    const ctx = await resolveUserContext({
      requireAuth: true,
      allowLabDemo: false,
    });
    userId = ctx.userId;
    mode = ctx.mode;
  } catch (error: unknown) {
    const appError = asAppError(error);
    if (isUnauthorized(appError)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    logError('Error resolving user context in api/buckets DELETE', appError);
    return new NextResponse('Failed to resolve user context', { status: 500 });
  }

  try {
    assertUserId(userId, 'api/buckets DELETE');

    const parsed = await parseJsonBody(request, BucketDeleteSchema);
    if (!parsed.ok) return parsed.response;
    const { bucketId } = parsed.data;

    const bucket = await prisma.bucket.findFirst({
      where: { id: bucketId, userId },
    });
    if (!bucket) {
      return new NextResponse('Bucket not found for user', { status: 404 });
    }

    await prisma.bucket.deleteMany({
      where: { id: bucket.id, userId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    const appError = asAppError(error);
    if (isPrismaP2003(error)) {
      logInvariant('P2003 in api/buckets DELETE', {
        userId,
        mode,
        meta: asLogMeta(error.meta),
        err: error,
      });
    } else {
      logInvariant('Error in api/buckets DELETE', { userId, mode, err: appError });
      logError('Error deleting bucket', appError);
    }
    return new NextResponse('Failed to delete bucket', { status: 500 });
  }
}
