'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { BucketPeriod, RewardCategory } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { resolveUserContext } from '@/lib/user-context';
import { assertUserId } from '@/lib/invariants';
import { computeBucketBalanceFromNumbers, deriveLegacyCurrentAmount } from '@/lib/buckets-runtime';
import type { ActionState } from '../../_lib/form-state';

const BucketSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  budgetAmount: z.string().trim(),
  category: z.nativeEnum(RewardCategory, { required_error: 'Category is required' }),
  period: z.enum(['WEEKLY', 'MONTHLY']),
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

export async function createBucket(
  _state: ActionState,
  formData: FormData
): Promise<ActionState | void> {
  const parsed = BucketSchema.safeParse({
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
  assertUserId(userId, 'onboarding createBucket');

  const now = new Date();
  const { start, end } = getPeriodWindow(parsed.data.period as BucketPeriod, now);
  const balance = computeBucketBalanceFromNumbers(cents, 0, 0);

  await prisma.bucket.create({
    data: {
      userId,
      name: parsed.data.name,
      period: parsed.data.period as BucketPeriod,
      budgetAmount: cents,
      currentAmount: deriveLegacyCurrentAmount(balance),
      spentCents: balance.postedSpendCents,
      strictMode: true,
      category: parsed.data.category,
      periodStart: start,
      periodEnd: end,
    },
  });

  redirect('/app/autopilot');
}
