'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { fetchFromApi, requireUserContext } from '../../../../../_lib/api.js';
import type { ActionState } from '../../../_lib/form-state.js';
import { buildCardPayload, cardFields, readCardFields } from '../../../_lib/card-input.js';

const UpdateCardSchema = z
  .object({ cardId: z.string().trim().min(1, 'Card id is required'), ...cardFields })
  .strict();

const DeleteCardSchema = z
  .object({
    cardId: z.string().trim().min(1, 'Card id is required'),
  })
  .strict();

export async function updateCard(
  _state: ActionState,
  formData: FormData
): Promise<ActionState | void> {
  const parsed = UpdateCardSchema.safeParse({ cardId: formData.get('cardId'), ...readCardFields(formData) });

  if (!parsed.success) {
    const { fieldErrors } = parsed.error.flatten();
    return { status: 'error', message: 'Fix the highlighted fields.', fieldErrors };
  }

  const built = buildCardPayload(parsed.data);
  if (!built.ok) return built.state;

  await requireUserContext('/app/onboarding');
  const response = await fetchFromApi<unknown>(`/api/cards/${parsed.data.cardId}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(built.payload),
  });
  if (response.ok !== true && response.error === 'NOT_FOUND') {
    return { status: 'error', message: 'Card not found for this user.' };
  }
  if (response.ok !== true) {
    return { status: 'error', message: 'Failed to update card.' };
  }

  redirect('/app/onboarding');
}

export async function deleteCard(
  _state: ActionState,
  formData: FormData
): Promise<ActionState | void> {
  const parsed = DeleteCardSchema.safeParse({
    cardId: formData.get('cardId'),
  });

  if (!parsed.success) {
    const { fieldErrors } = parsed.error.flatten();
    return { status: 'error', message: 'Card id is required.', fieldErrors };
  }

  await requireUserContext('/app/onboarding');
  const response = await fetchFromApi<unknown>('/api/cards', {
    method: 'DELETE',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ cardId: parsed.data.cardId }),
  });
  if (response.ok !== true && response.error === 'NOT_FOUND') {
    return { status: 'error', message: 'Card not found for this user.' };
  }
  if (response.ok !== true) {
    return { status: 'error', message: 'Failed to delete card.' };
  }

  redirect('/app/onboarding');
}
