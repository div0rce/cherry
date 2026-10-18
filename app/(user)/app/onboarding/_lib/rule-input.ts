import { z } from 'zod';
import { RewardCategory } from '@prisma/client';
import type { ActionState } from './form-state.js';

// Reward-rule form fields and payload, shared by the create and update actions.
const ALLOWED_CATEGORIES = [
  RewardCategory.DINING,
  RewardCategory.GROCERIES,
  RewardCategory.GAS,
  RewardCategory.TRAVEL,
  RewardCategory.OTHER,
] as const satisfies ReadonlyArray<RewardCategory>;
type AllowedCategory = (typeof ALLOWED_CATEGORIES)[number];

export const ruleFields = {
  scope: z.enum(['BASE', 'CATEGORY']),
  category: z.string().trim().min(1, 'Category is required'),
  rateKind: z.enum(['points', 'cashback']),
  rateValue: z.string().trim(),
};

export function readRuleFields(formData: FormData): Record<string, FormDataEntryValue | null> {
  return {
    scope: formData.get('scope'),
    category: formData.get('category'),
    rateKind: formData.get('rateKind'),
    rateValue: formData.get('rateValue'),
  };
}

type RuleData = { scope: 'BASE' | 'CATEGORY'; category: string; rateKind: 'points' | 'cashback'; rateValue: string };
export type RulePayload = { category: AllowedCategory; multiplier: number | undefined; cashbackPercent: number | undefined };

const CATEGORY_ERROR = 'Choose a supported category.';

function resolveCategory(data: RuleData): AllowedCategory | null {
  const candidate = data.scope === 'BASE' ? RewardCategory.OTHER : (data.category as RewardCategory);
  return ALLOWED_CATEGORIES.includes(candidate as AllowedCategory) ? (candidate as AllowedCategory) : null;
}

export function buildRulePayload(data: RuleData): { ok: true; payload: RulePayload } | { ok: false; state: ActionState } {
  const rate = Number.parseFloat(data.rateValue);
  if (!Number.isFinite(rate) || rate <= 0) {
    const error = 'Enter a positive reward rate.';
    return { ok: false, state: { status: 'error', message: error, fieldErrors: { rateValue: [error] } } };
  }
  const category = resolveCategory(data);
  if (category === null) {
    return { ok: false, state: { status: 'error', message: CATEGORY_ERROR, fieldErrors: { category: [CATEGORY_ERROR] } } };
  }
  return {
    ok: true,
    payload: {
      category,
      multiplier: data.rateKind === 'points' ? rate : undefined,
      cashbackPercent: data.rateKind === 'cashback' ? rate : undefined,
    },
  };
}
