'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { fetchFromApi, requireUserContext } from '../../../../../../../_lib/api.js';
import type { ActionState } from '../../../../../_lib/form-state.js';
import { buildRulePayload, readRuleFields, ruleFields } from '../../../../../_lib/rule-input.js';

const UpdateRuleSchema = z
  .object({
    cardId: z.string().trim().min(1, 'Card id is required'),
    ruleId: z.string().trim().min(1, 'Rule id is required'),
    ...ruleFields,
  })
  .strict();

const DeleteRuleSchema = z
  .object({
    cardId: z.string().trim().min(1, 'Card id is required'),
    ruleId: z.string().trim().min(1, 'Rule id is required'),
  })
  .strict();

export async function updateRewardRule(
  _state: ActionState,
  formData: FormData
): Promise<ActionState | void> {
  const parsed = UpdateRuleSchema.safeParse({
    cardId: formData.get('cardId'),
    ruleId: formData.get('ruleId'),
    ...readRuleFields(formData),
  });

  if (!parsed.success) {
    const { fieldErrors } = parsed.error.flatten();
    return { status: 'error', message: 'Fix the highlighted fields.', fieldErrors };
  }

  const built = buildRulePayload(parsed.data);
  if (!built.ok) return built.state;

  await requireUserContext('/app/onboarding');
  const response = await fetchFromApi<unknown>(`/api/cards/${parsed.data.cardId}/rewards`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ rewardRuleId: parsed.data.ruleId, ...built.payload }),
  });
  if (response.ok !== true && response.error === 'NOT_FOUND') {
    redirect('/app/onboarding?missing=rules');
    return;
  }
  if (response.ok !== true) {
    return { status: 'error', message: 'Failed to update reward rule.' };
  }

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

  await requireUserContext('/app/onboarding');
  const response = await fetchFromApi<unknown>(`/api/cards/${parsed.data.cardId}/rewards`, {
    method: 'DELETE',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ rewardRuleId: parsed.data.ruleId }),
  });
  if (response.ok !== true && response.error === 'NOT_FOUND') {
    redirect('/app/onboarding?missing=rules');
    return;
  }
  if (response.ok !== true) {
    return { status: 'error', message: 'Failed to delete reward rule.' };
  }

  redirect('/app/onboarding');
}
