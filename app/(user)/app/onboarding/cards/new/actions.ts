'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { fetchFromApi, requireUserContext } from '../../../../_lib/api.js';
import type { ActionState } from '../../_lib/form-state.js';
import { buildCardPayload, cardFields, readCardFields } from '../../_lib/card-input.js';

const CardSchema = z.object(cardFields).strict();

export async function createCard(
  _state: ActionState,
  formData: FormData
): Promise<ActionState | void> {
  const parsed = CardSchema.safeParse(readCardFields(formData));

  if (!parsed.success) {
    const { fieldErrors } = parsed.error.flatten();
    return { status: 'error', message: 'Fix the highlighted fields.', fieldErrors };
  }

  const built = buildCardPayload(parsed.data);
  if (!built.ok) return built.state;

  await requireUserContext('/app/onboarding');
  const response = await fetchFromApi<{ id?: string }>('/api/cards', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(built.payload),
  });
  if (response.ok !== true) {
    return { status: 'error', message: 'Failed to create card.' };
  }
  const created = response.data;
  if (typeof created.id !== 'string' || created.id.length === 0) {
    return { status: 'error', message: 'Card created without an id.' };
  }

  redirect(`/app/onboarding/cards/${created.id}/rules/new`);
}
