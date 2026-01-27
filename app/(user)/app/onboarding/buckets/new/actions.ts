'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { RewardCategory } from '@prisma/client';
import type { BucketPeriod } from '@prisma/client';
import { resolveExplicitNow } from '../../../../_lib/clock.js';
import { fetchFromApi, requireUserContext } from '../../../../_lib/api.js';
import type { ActionState } from '../../_lib/form-state.js';

const BucketSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(80),
    budgetAmount: z.string().trim(),
    category: z.nativeEnum(RewardCategory),
    period: z.enum(['WEEKLY', 'MONTHLY']),
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
  if (typeof error === 'string' || cents === null) {
    return {
      status: 'error',
      message: error ?? null,
      fieldErrors: { budgetAmount: [error ?? 'Invalid amount'] },
    };
  }

  await requireUserContext();
  const now = resolveExplicitNow(formData.get('now'));
  const response = await fetchFromApi<unknown>('/api/buckets', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: parsed.data.name,
      period: parsed.data.period as BucketPeriod,
      budgetAmountCents: cents,
      currentAmountCents: null,
      strictMode: true,
      category: parsed.data.category,
      nowMs: now.getTime(),
    }),
  });

  if (response.ok !== true) {
    return { status: 'error', message: 'Failed to create bucket.' };
  }

  redirect('/app/autopilot');
}
