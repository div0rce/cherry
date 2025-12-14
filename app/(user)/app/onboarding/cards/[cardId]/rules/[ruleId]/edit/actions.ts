'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { RewardCategory } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { resolveUserContext } from '@/lib/user-context';
import { assertUserId } from '@/lib/invariants';
import type { ActionState } from '../../../../../_lib/form-state';

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

const UpdateRuleSchema = z
  .object({
    cardId: z.string().trim().min(1, 'Card id is required'),
    ruleId: z.string().trim().min(1, 'Rule id is required'),
    scope: z.enum(['BASE', 'CATEGORY']),
    category: z.string().trim().min(1, 'Category is required'),
    rateKind: z.enum(['points', 'cashback']),
    rateValue: z.string().trim(),
  })
  .strict();

const DeleteRuleSchema = z
  .object({
    cardId: z.string().trim().min(1, 'Card id is required'),
    ruleId: z.string().trim().min(1, 'Rule id is required'),
  })
  .strict();

function parseRate(raw: string): { value: number | null; error?: string } {
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return { value: null, error: 'Enter a positive reward rate.' };
  }
  return { value: parsed };
}

async function findRuleForUser(cardId: string, ruleId: string, userId: string) {
  return prisma.rewardRule.findFirst({
    where: { id: ruleId, card: { id: cardId, userId } },
    select: { id: true },
  });
}

export async function updateRewardRule(
  _state: ActionState,
  formData: FormData
): Promise<ActionState | void> {
  const parsed = UpdateRuleSchema.safeParse({
    cardId: formData.get('cardId'),
    ruleId: formData.get('ruleId'),
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

  const { userId } = await resolveUserContext({ requireAuth: true, allowLabDemo: true });
  assertUserId(userId, 'onboarding updateRewardRule');

  const rule = await findRuleForUser(parsed.data.cardId, parsed.data.ruleId, userId);
  if (rule === null) {
    redirect('/app/onboarding?missing=rules');
    return;
  }

  const categoryValue: RewardCategory = allowedCategory;

  await prisma.rewardRule.update({
    where: { id: parsed.data.ruleId },
    data: {
      category: categoryValue,
      multiplier: parsed.data.rateKind === 'points' ? rateValue : null,
      cashbackPercent: parsed.data.rateKind === 'cashback' ? rateValue : null,
    },
  });

  redirect('/app/onboarding');
}

export async function deleteRewardRule(
  _state: ActionState,
  formData: FormData
): Promise<ActionState | void> {
  const parsed = DeleteRuleSchema.safeParse({
    cardId: formData.get('cardId'),
    ruleId: formData.get('ruleId'),
  });

  if (!parsed.success) {
    const { fieldErrors } = parsed.error.flatten();
    return { status: 'error', message: 'Rule id is required.', fieldErrors };
  }

  const { userId } = await resolveUserContext({ requireAuth: true, allowLabDemo: true });
  assertUserId(userId, 'onboarding deleteRewardRule');

  const rule = await findRuleForUser(parsed.data.cardId, parsed.data.ruleId, userId);
  if (rule === null) {
    redirect('/app/onboarding?missing=rules');
    return;
  }

  await prisma.rewardRule.delete({ where: { id: parsed.data.ruleId } });
  redirect('/app/onboarding');
}
