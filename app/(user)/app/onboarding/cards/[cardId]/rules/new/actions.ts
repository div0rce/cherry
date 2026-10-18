'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { fetchFromApi, requireUserContext } from '../../../../../../_lib/api.js';
import type { ActionState } from '../../../../_lib/form-state.js';
import { buildRulePayload, readRuleFields, ruleFields } from '../../../../_lib/rule-input.js';

const RuleSchema = z
  .object({ cardId: z.string().trim().min(1, 'Card id is required'), ...ruleFields })
  .strict();

export async function createRewardRule(
  _state: ActionState,
  formData: FormData
): Promise<ActionState | void> {
  const parsed = RuleSchema.safeParse({ cardId: formData.get('cardId'), ...readRuleFields(formData) });

  if (!parsed.success) {
    const { fieldErrors } = parsed.error.flatten();
    return { status: 'error', message: 'Fix the highlighted fields.', fieldErrors };
  }

  const built = buildRulePayload(parsed.data);
  if (!built.ok) return built.state;

  await requireUserContext('/app/onboarding');
  const response = await fetchFromApi<unknown>(`/api/cards/${parsed.data.cardId}/rewards`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(built.payload),
  });

  if (response.ok !== true && response.error === 'NOT_FOUND') {
    redirect('/app/onboarding?missing=cards');
    return;
  }
  if (response.ok !== true) {
    return { status: 'error', message: 'Failed to create reward rule.' };
  }

  const bucketsResponse = await fetchFromApi<Array<{ id?: string }>>('/api/buckets');
  if (bucketsResponse.ok === true) {
    const buckets = bucketsResponse.data;
    if (buckets.length === 0) {
      redirect('/app/onboarding/buckets/new');
      return;
    }
  }

  redirect('/app/onboarding');
}
