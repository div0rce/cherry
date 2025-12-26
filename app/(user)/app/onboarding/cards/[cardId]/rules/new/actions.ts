'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { RewardCategory } from '@prisma/client';
import { fetchFromApi, requireUserContext } from '@/app/(user)/_lib/api';
import type { ActionState } from '../../../../_lib/form-state';

const ALLOWED_CATEGORIES = [
  RewardCategory.DINING,
  RewardCategory.GROCERIES,
  RewardCategory.GAS,
  RewardCategory.TRAVEL,
  RewardCategory.OTHER,
] as const satisfies ReadonlyArray<RewardCategory>;

function isAllowedCategory(value: RewardCategory): value is (typeof ALLOWED_CATEGORIES)[number] {
  return ALLOWED_CATEGORIES.includes(value as (typeof ALLOWED_CATEGORIES)[number]);
}

const RuleSchema = z
  .object({
    cardId: z.string().trim().min(1, 'Card id is required'),
    scope: z.enum(['BASE', 'CATEGORY']),
    category: z.string().trim().min(1, 'Category is required'),
    rateKind: z.enum(['points', 'cashback']),
    rateValue: z.string().trim(),
  })
  .strict();

function parseRate(raw: string): { value: number | null; error?: string } {
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return { value: null, error: 'Enter a positive reward rate.' };
  }
  return { value: parsed };
}

export async function createRewardRule(
  _state: ActionState,
  formData: FormData
): Promise<ActionState | void> {
  const parsed = RuleSchema.safeParse({
    cardId: formData.get('cardId'),
    scope: formData.get('scope'),
    category: formData.get('category'),
    rateKind: formData.get('rateKind'),
    rateValue: formData.get('rateValue'),
  });

  if (!parsed.success) {
    const { fieldErrors } = parsed.error.flatten();
    return { status: 'error', message: 'Fix the highlighted fields.', fieldErrors };
  }

  const { value: rateValue, error } = parseRate(parsed.data.rateValue);
  if (typeof error === 'string' || rateValue === null) {
    return { status: 'error', message: error ?? null, fieldErrors: { rateValue: [error ?? 'Invalid rate'] } };
  }

  const categoryCandidate: RewardCategory =
    parsed.data.scope === 'BASE' ? RewardCategory.OTHER : (parsed.data.category as RewardCategory);
  const allowedCategory = isAllowedCategory(categoryCandidate) ? categoryCandidate : null;
  if (allowedCategory === null) {
    return {
      status: 'error',
      message: 'Choose a supported category.',
      fieldErrors: { category: ['Choose a supported category.'] },
    };
  }

  await requireUserContext();
  const response = await fetchFromApi(`/api/cards/${parsed.data.cardId}/rewards`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      category: allowedCategory,
      multiplier: parsed.data.rateKind === 'points' ? rateValue : undefined,
      cashbackPercent: parsed.data.rateKind === 'cashback' ? rateValue : undefined,
    }),
  });

  if (response.status === 404) {
    redirect('/app/onboarding?missing=cards');
    return;
  }
  if (!response.ok) {
    return { status: 'error', message: 'Failed to create reward rule.' };
  }

  const bucketsResponse = await fetchFromApi('/api/buckets');
  if (bucketsResponse.ok) {
    const buckets = (await bucketsResponse.json()) as Array<{ id?: string }>;
    if (buckets.length === 0) {
      redirect('/app/onboarding/buckets/new');
      return;
    }
  }

  redirect('/app/onboarding');
}
