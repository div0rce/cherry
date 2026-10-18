import { z } from 'zod';
import type { ActionState } from './form-state.js';

// Card form fields and payload, shared by the create and update actions.
const ALLOWED_NETWORKS = ['VISA', 'MASTERCARD', 'AMEX', 'DISCOVER', 'OTHER'] as const;

export const cardFields = {
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
};

export function readCardFields(formData: FormData): Record<string, FormDataEntryValue | null> {
  return {
    nickname: formData.get('nickname'),
    issuer: formData.get('issuer'),
    network: formData.get('network'),
    cardType: formData.get('cardType'),
    annualFee: formData.get('annualFee'),
  };
}

type CardData = {
  nickname: string;
  issuer?: string | undefined;
  network?: string | undefined;
  cardType: 'credit' | 'debit';
  annualFee?: string | undefined;
};
export type CardPayload = { nickname: string; issuer: string; network: string; isCredit: boolean; annualFee: number | null };

function parseAnnualFee(raw?: string): { cents: number | null; error?: string } {
  const normalized = raw?.trim() ?? '';
  if (normalized === '') return { cents: null };
  const value = Number.parseFloat(normalized);
  if (!Number.isFinite(value) || value < 0) {
    return { cents: null, error: 'Annual fee must be zero or greater.' };
  }
  return { cents: Math.round(value * 100) };
}

function trimmedOr(value: string | undefined, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

export function buildCardPayload(data: CardData): { ok: true; payload: CardPayload } | { ok: false; state: ActionState } {
  const { cents, error } = parseAnnualFee(data.annualFee);
  if (typeof error === 'string') {
    return { ok: false, state: { status: 'error', message: error, fieldErrors: { annualFee: [error] } } };
  }
  return {
    ok: true,
    payload: {
      nickname: data.nickname,
      issuer: trimmedOr(data.issuer, 'Custom issuer'),
      network: trimmedOr(data.network, 'OTHER').toUpperCase(),
      isCredit: data.cardType === 'credit',
      annualFee: cents,
    },
  };
}
