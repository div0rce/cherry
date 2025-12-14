'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { BucketPeriod, RewardCategory } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { resolveUserContext } from '@/lib/user-context';
import { assertUserId } from '@/lib/invariants';
import { computeBucketBalanceFromNumbers, deriveLegacyCurrentAmount } from '@/lib/buckets-runtime';
import type { ActionState } from '../../../_lib/form-state';

const UpdateBucketSchema = z.object({
  bucketId: z.string().trim().min(1, 'Bucket id is required'),
  name: z.string().trim().min(1, 'Name is required').max(80),
  budgetAmount: z.string().trim(),
  category: z.nativeEnum(RewardCategory, { required_error: 'Category is required' }),
  period: z.enum(['WEEKLY', 'MONTHLY']),
});

const DeleteBucketSchema = z.object({
  bucketId: z.string().trim().min(1, 'Bucket id is required'),
});

function parseBudget(raw: string): { cents: number | null; error?: string } {
  const normalized = raw.trim();
  if (normalized === '') return { cents: null, error: 'Budget is required.' };
  const value = Number.parseFloat(normalized);
  if (!Number.isFinite(value) || value <= 0) {
    return { cents: null, error: 'Enter a positive budget amount.' };
  }
  return { cents: Math.round(value * 100) };
}

function getPeriodWindow(period: BucketPeriod, now: Date): { start: Date; end: Date } {
  const start = new Date(now);
  const end = new Date(now);

  if (period === 'WEEKLY') {
    const day = start.getDay();
    const diffToMonday = (day + 6) % 7;
    start.setDate(start.getDate() - diffToMonday);
    start.setHours(0, 0, 0, 0);
    end.setTime(start.getTime());
    end.setDate(start.getDate() + 7);
  } else {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    end.setTime(start.getTime());
    end.setMonth(start.getMonth() + 1);
  }

  end.setHours(0, 0, 0, 0);
  return { start, end };
}

export async function updateBucket(
  _state: ActionState,
  formData: FormData
): Promise<ActionState | void> {
  const parsed = UpdateBucketSchema.safeParse({
    bucketId: formData.get('bucketId'),
    name: formData.get('name'),
    budgetAmount: formData.get('budgetAmount'),
    category: formData.get('category'),
    period: formData.get('period'),
  });

  if (!parsed.success) {
    const { fieldErrors } = parsed.error.flatten();
    return { status: 'error', message: 'Fix the highlighted fields.', fieldErrors };
  }

  const { cents, error } = parseBudget(parsed.data.budgetAmount);
  if (error || cents === null) {
    return { status: 'error', message: error, fieldErrors: { budgetAmount: [error ?? 'Invalid amount'] } };
  }

  const { userId } = await resolveUserContext({ requireAuth: true, allowLabDemo: true });
  assertUserId(userId, 'onboarding updateBucket');

  const bucket = await prisma.bucket.findFirst({
    where: { id: parsed.data.bucketId, userId },
    select: { id: true, spentCents: true, period: true },
  });

  if (!bucket) {
    redirect('/app/onboarding?missing=buckets');
  }

  const bucketRecord = bucket;
  const now = new Date();
  const desiredPeriod = parsed.data.period as BucketPeriod;
  const { start, end } = getPeriodWindow(desiredPeriod, now);
  const balance = computeBucketBalanceFromNumbers(cents, bucketRecord.spentCents, 0);

  await prisma.bucket.update({
    where: { id: parsed.data.bucketId },
    data: {
      name: parsed.data.name,
      budgetAmount: cents,
      category: parsed.data.category,
      period: desiredPeriod,
      currentAmount: deriveLegacyCurrentAmount(balance),
      spentCents: balance.postedSpendCents,
      periodStart: start,
      periodEnd: end,
    },
  });

  redirect('/app/onboarding');
}

export async function deleteBucket(
  _state: ActionState,
  formData: FormData
): Promise<ActionState | void> {
  const parsed = DeleteBucketSchema.safeParse({
    bucketId: formData.get('bucketId'),
  });

  if (!parsed.success) {
    const { fieldErrors } = parsed.error.flatten();
    return { status: 'error', message: 'Bucket id is required.', fieldErrors };
  }

  const { userId } = await resolveUserContext({ requireAuth: true, allowLabDemo: true });
  assertUserId(userId, 'onboarding deleteBucket');

  const bucket = await prisma.bucket.findFirst({
    where: { id: parsed.data.bucketId, userId },
    select: { id: true },
  });

  if (!bucket) {
    redirect('/app/onboarding?missing=buckets');
  }

  await prisma.bucket.delete({ where: { id: parsed.data.bucketId } });
  redirect('/app/onboarding');
}
