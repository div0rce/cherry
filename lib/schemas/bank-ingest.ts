import { z } from 'zod';

const dateFromJson = z.preprocess((value) => {
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return value;
}, z.date());

export const RawBankTransactionSchema = z
  .object({
    externalId: z.string().min(1),
    accountExternalId: z.string().min(1),
    userExternalId: z.string().min(1).optional(),
    amountCents: z.number().finite(),
    currency: z.string().min(1),
    occurredAt: dateFromJson,
    postedAt: dateFromJson.nullish(),
    description: z.string(),
    merchantName: z.string().optional().nullable(),
    mcc: z.union([z.string(), z.number()]).optional().nullable(),
    merchantCity: z.string().optional().nullable(),
    merchantRegion: z.string().optional().nullable(),
    merchantCountry: z.string().optional().nullable(),
    raw: z.unknown().optional(),
  })
  .strict();

export const BankIngestRequestSchema = z
  .object({
    transactions: z.array(RawBankTransactionSchema).min(1),
  })
  .strict();

export type RawBankTransactionInput = z.infer<typeof RawBankTransactionSchema>;
