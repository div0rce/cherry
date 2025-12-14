'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { RewardCategory } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { resolveUserContext } from '@/lib/user-context';
import { assertUserId } from '@/lib/invariants';
import type { ActionState } from '../../../../_lib/form-state';

const ALLOWED_CATEGORIES = [
  RewardCategory.DINING,
  RewardCategory.GROCERIES,
  RewardCategory.GAS,
  RewardCategory.TRAVEL,
  RewardCategory.OTHER,
] as const;

const RuleSchema = z.object({
  cardId: z.string().trim().min(1, 'Card id is required'),
  scope: z.enum(['BASE', 'CATEGORY']),
  category: z.string().trim().min(1, 'Category is required'),
  rateKind: z.enum(['points', 'cashback']),
  rateValue: z.string().trim(),
});

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
  if (error || rateValue === null) {
    return { status: 'error', message: error, fieldErrors: { rateValue: [error ?? 'Invalid rate'] } };
  }

  const categoryValue =
    parsed.data.scope === 'BASE' ? RewardCategory.OTHER : (parsed.data.category as RewardCategory);
  if (!ALLOWED_CATEGORIES.includes(categoryValue)) {
    return {
      status: 'error',
      message: 'Choose a supported category.',
      fieldErrors: { category: ['Choose a supported category.'] },
    };
  }

  const { userId } = await resolveUserContext({ requireAuth: true, allowLabDemo: true });
  assertUserId(userId, 'onboarding createRewardRule');

  const card = await prisma.card.findFirst({
    where: { id: parsed.data.cardId, userId },
    select: { id: true },
  });

  if (!card) {
    redirect('/app/onboarding?missing=cards');
  }

  const cardIdForRule = card.id;

  await prisma.rewardRule.create({
    data: {
      cardId: cardIdForRule,
      category: categoryValue,
      multiplier: parsed.data.rateKind === 'points' ? rateValue : null,
      cashbackPercent: parsed.data.rateKind === 'cashback' ? rateValue : null,
    },
  });

  const bucketsCount = await prisma.bucket.count({ where: { userId } });
  if (bucketsCount === 0) {
    redirect('/app/onboarding/buckets/new');
  }

  redirect('/app/onboarding');
}
