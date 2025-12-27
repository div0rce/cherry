'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { BucketPeriod, RewardCategory } from '@prisma/client';
import { fetchFromApi, requireUserContext } from '../../../../../_lib/api';
import { resolveExplicitNow } from '../../../../../_lib/clock';
import type { ActionState } from '../../../_lib/form-state';

const UpdateBucketSchema = z
  .object({
    bucketId: z.string().trim().min(1, 'Bucket id is required'),
    name: z.string().trim().min(1, 'Name is required').max(80),
    budgetAmount: z.string().trim(),
    category: z.nativeEnum(RewardCategory),
    period: z.enum(['WEEKLY', 'MONTHLY']),
  })
  .strict();

const DeleteBucketSchema = z
  .object({
    bucketId: z.string().trim().min(1, 'Bucket id is required'),
  })
  .strict();

function parseBudget(raw: string): { cents: number | null; error?: string } {
  const normalized = raw.trim();
  if (normalized === '') return { cents: null, error: 'Budget is required.' };
  const value = Number.parseFloat(normalized);
  if (!Number.isFinite(value) || value <= 0) {
    return { cents: null, error: 'Enter a positive budget amount.' };
  }
  return { cents: Math.round(value * 100) };
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
  if (typeof error === 'string' || cents === null) {
    return {
      status: 'error',
      message: error ?? null,
      fieldErrors: { budgetAmount: [error ?? 'Invalid amount'] },
    };
  }

  await requireUserContext();

  const now = resolveExplicitNow(formData.get('now'));
  const desiredPeriod = parsed.data.period as BucketPeriod;
  const response = await fetchFromApi<unknown>(`/api/buckets/${parsed.data.bucketId}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: parsed.data.name,
      budgetAmountCents: cents,
      category: parsed.data.category,
      period: desiredPeriod,
      nowMs: now.getTime(),
    }),
  });

  if (!response.ok && response.error === 'NOT_FOUND') {
    redirect('/app/onboarding?missing=buckets');
    return;
  }
  if (!response.ok) {
    return { status: 'error', message: 'Failed to update bucket.' };
  }

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

  await requireUserContext();
  const response = await fetchFromApi<unknown>(`/api/buckets/${parsed.data.bucketId}`, {
    method: 'DELETE',
  });
  if (!response.ok && response.error === 'NOT_FOUND') {
    redirect('/app/onboarding?missing=buckets');
    return;
  }
  if (!response.ok) {
    return { status: 'error', message: 'Failed to delete bucket.' };
  }
  redirect('/app/onboarding');
}
