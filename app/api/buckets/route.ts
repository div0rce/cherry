import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
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
import { auth } from '../../../lib/auth.js';
import type { z } from 'zod';

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
      getSession: auth,
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

type BucketCreateInput = z.infer<typeof BucketCreateSchema>;

type CallerContext = { userId: string | null; mode: string | null };

type ValidBucketCreate = {
  normalizedName: string;
  normalizedCategory: string;
  period: BucketPeriod;
  budgetAmountCents: number;
  currentCentsValue: number | null;
};

const validPeriods: BucketPeriod[] = [BucketPeriod.WEEKLY, BucketPeriod.MONTHLY];

function badRequest(message: string): NextResponse {
  return new NextResponse(message, { status: 400 });
}

function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && !Number.isNaN(value);
}

function hasRequiredFields(data: BucketCreateInput): boolean {
  const { budgetAmountCents } = data;
  const hasBudgetAmount =
    budgetAmountCents !== null && budgetAmountCents !== undefined && !Number.isNaN(budgetAmountCents);
  return [data.name, data.period, data.category].every(isNonEmptyString) && hasBudgetAmount;
}

function isInvalidCurrentAmount(currentAmountCents: unknown): boolean {
  return currentAmountCents != null && !(isValidNumber(currentAmountCents) && currentAmountCents >= 0);
}

function checkPeriodAndCategory(period: string, normalizedCategory: string): NextResponse | null {
  if (!validPeriods.includes(period as BucketPeriod)) {
    return badRequest(`Invalid period. Expected one of: ${validPeriods.join(', ')}`);
  }
  const validCategories = Object.values(RewardCategory) as string[];
  if (!validCategories.includes(normalizedCategory)) {
    return badRequest(`Invalid category. Expected one of: ${validCategories.join(', ')}`);
  }
  return null;
}

/**
 * Validate a create payload in the original check order; the first failing
 * check decides the 400 message.
 */
function validateBucketCreate(
  data: BucketCreateInput
): { ok: true; value: ValidBucketCreate } | { ok: false; response: NextResponse } {
  if (!hasRequiredFields(data)) {
    return { ok: false, response: badRequest('Missing required fields: name, period, budgetAmountCents, category') };
  }
  const { name, period, budgetAmountCents, currentAmountCents, category } = data;
  const normalizedName = String(name).trim();
  const normalizedCategory = String(category).trim().toUpperCase();

  if (normalizedName === '') {
    return { ok: false, response: badRequest('name is required') };
  }
  if (!isValidNumber(budgetAmountCents) || budgetAmountCents <= 0) {
    return { ok: false, response: badRequest('budgetAmountCents must be a positive number') };
  }
  // currentAmount is legacy; only used here to seed spentCents on creation.
  if (isInvalidCurrentAmount(currentAmountCents)) {
    return { ok: false, response: badRequest('currentAmountCents must be a non-negative number when provided') };
  }
  const enumError = checkPeriodAndCategory(String(period), normalizedCategory);
  if (enumError !== null) {
    return { ok: false, response: enumError };
  }
  const currentCentsValue = typeof currentAmountCents === 'number' ? Math.floor(currentAmountCents) : null;
  return {
    ok: true,
    value: {
      normalizedName,
      normalizedCategory,
      period: period as BucketPeriod,
      budgetAmountCents,
      currentCentsValue,
    },
  };
}

/**
 * Resolve the caller for a mutating handler. Unauthorized maps to 401, any
 * other failure to 500.
 */
async function resolveCaller(
  method: string
): Promise<{ ok: true; value: CallerContext } | { ok: false; response: NextResponse }> {
  try {
    const ctx = await resolveUserContext({
      getSession: auth,
      requireAuth: true,
      allowLabDemo: false,
    });
    return { ok: true, value: { userId: ctx.userId, mode: ctx.mode } };
  } catch (error: unknown) {
    const appError = asAppError(error);
    if (isUnauthorized(appError)) {
      return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
    }
    logError(`Error resolving user context in api/buckets ${method}`, appError);
    return { ok: false, response: new NextResponse('Failed to resolve user context', { status: 500 }) };
  }
}

function logMutationFailure(error: unknown, caller: CallerContext, method: string, message: string): void {
  const { userId, mode } = caller;
  const appError = asAppError(error);
  if (isPrismaP2003(error)) {
    logInvariant(`P2003 in api/buckets ${method}`, {
      userId,
      mode,
      meta: asLogMeta(error.meta),
      err: error,
    });
    return;
  }
  logInvariant(`Error in api/buckets ${method}`, { userId, mode, err: appError });
  logError(message, appError);
}

async function createBucket(userId: string, input: ValidBucketCreate, strictMode: unknown) {
  const now = new Date();
  const { start: periodStart, end: periodEnd } = getPeriodWindow(input.period, now);
  const limitCents = Math.floor(input.budgetAmountCents);
  const postedSpendCents =
    input.currentCentsValue == null ? 0 : Math.max(limitCents - input.currentCentsValue, 0);
  const balance = computeBucketBalanceFromNumbers(limitCents, postedSpendCents, 0);

  return prisma.bucket.create({
    data: {
      userId,
      name: input.normalizedName,
      period: input.period,
      budgetAmount: limitCents,
      currentAmount: deriveLegacyCurrentAmount(balance),
      spentCents: balance.postedSpendCents,
      periodStart,
      periodEnd,
      strictMode: Boolean(strictMode),
      category: input.normalizedCategory as RewardCategory,
    },
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const caller = await resolveCaller('POST');
  if (!caller.ok) return caller.response;
  const { userId } = caller.value;

  try {
    assertUserId(userId, 'api/buckets POST');
    const parsed = await parseJsonBody(request, BucketCreateSchema);
    if (parsed.ok !== true) return parsed.response;
    const { strictMode = true } = parsed.data;
    const validated = validateBucketCreate(parsed.data);
    if (!validated.ok) return validated.response;

    const bucket = await createBucket(userId, validated.value, strictMode);
    return NextResponse.json(toBucketRuntime(bucket), { status: 201 });
  } catch (error: unknown) {
    logMutationFailure(error, caller.value, 'POST', 'Error creating bucket');
    return NextResponse.json(
      { error: 'Bucket create failed due to FK or user context' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const caller = await resolveCaller('DELETE');
  if (!caller.ok) return caller.response;
  const { userId } = caller.value;

  try {
    assertUserId(userId, 'api/buckets DELETE');

    const parsed = await parseJsonBody(request, BucketDeleteSchema);
    if (parsed.ok !== true) return parsed.response;
    const { bucketId } = parsed.data;

    const bucket = await prisma.bucket.findFirst({
      where: { id: bucketId, userId },
    });
    if (bucket === null) {
      return new NextResponse('Bucket not found for user', { status: 404 });
    }

    await prisma.bucket.deleteMany({
      where: { id: bucket.id, userId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    logMutationFailure(error, caller.value, 'DELETE', 'Error deleting bucket');
    return new NextResponse('Failed to delete bucket', { status: 500 });
  }
}
