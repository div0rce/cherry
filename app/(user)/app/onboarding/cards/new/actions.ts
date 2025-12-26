'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { fetchFromApi, requireUserContext } from '@/app/(user)/_lib/api';
import type { ActionState } from '../../_lib/form-state';

const ALLOWED_NETWORKS = ['VISA', 'MASTERCARD', 'AMEX', 'DISCOVER', 'OTHER'] as const;

const CardSchema = z
  .object({
    nickname: z.string().trim().min(1, 'Nickname is required').max(64),
    issuer: z.string().trim().max(64).optional(),
    network: z
      .string()
      .trim()
      .transform((value) => value.toUpperCase())
      .refine((value) => value === '' || ALLOWED_NETWORKS.includes(value as (typeof ALLOWED_NETWORKS)[number]), {
        message: 'Choose a network from the list.',
      })
      .optional(),
    cardType: z.enum(['credit', 'debit']),
    annualFee: z.string().trim().optional(),
  })
  .strict();

function parseAnnualFee(raw?: string): { cents: number | null; error?: string } {
  const normalized = raw?.trim() ?? '';
  if (normalized === '') return { cents: null };
  const value = Number.parseFloat(normalized);
  if (!Number.isFinite(value) || value < 0) {
    return { cents: null, error: 'Annual fee must be zero or greater.' };
  }
  return { cents: Math.round(value * 100) };
}

export async function createCard(
  _state: ActionState,
  formData: FormData
): Promise<ActionState | void> {
  const parsed = CardSchema.safeParse({
    nickname: formData.get('nickname'),
    issuer: formData.get('issuer'),
    network: formData.get('network'),
    cardType: formData.get('cardType'),
    annualFee: formData.get('annualFee'),
  });

  if (!parsed.success) {
    const { fieldErrors } = parsed.error.flatten();
    return { status: 'error', message: 'Fix the highlighted fields.', fieldErrors };
  }

  const { cents, error } = parseAnnualFee(parsed.data.annualFee);
  if (typeof error === 'string') {
    return { status: 'error', message: error ?? null, fieldErrors: { annualFee: [error] } };
  }

  const issuerInput = parsed.data.issuer;
  const hasIssuer = typeof issuerInput === 'string' && issuerInput.trim().length > 0;
  const issuer = hasIssuer ? issuerInput.trim() : 'Custom issuer';
  const networkInput = parsed.data.network;
  const hasNetwork = typeof networkInput === 'string' && networkInput.trim().length > 0;
  const network = hasNetwork ? networkInput.trim().toUpperCase() : 'OTHER';

  await requireUserContext();
  const response = await fetchFromApi('/api/cards', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      nickname: parsed.data.nickname,
      issuer,
      network,
      isCredit: parsed.data.cardType === 'credit',
      annualFee: cents,
    }),
  });
  if (!response.ok) {
    return { status: 'error', message: 'Failed to create card.' };
  }
  const created = (await response.json()) as { id?: string };
  if (typeof created.id !== 'string' || created.id.length === 0) {
    return { status: 'error', message: 'Card created without an id.' };
  }

  redirect(`/app/onboarding/cards/${created.id}/rules/new`);
}
