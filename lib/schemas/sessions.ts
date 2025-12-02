import { z } from 'zod';
import { CentsSchema } from './common';

export const CreateSessionSchema = z
  .object({
    merchantName: z.string().min(1),
    amountCents: CentsSchema.positive(),
    category: z.string().optional(),
    currency: z.string().min(1).optional(),
    deviceId: z.string().optional(),
    storeId: z.string().optional(),
    terminalId: z.string().optional(),
    orderId: z.string().optional(),
    mccCode: z.number().int().optional(),
  })
  .strict();

export const ConfirmSessionSchema = z
  .object({
    actualAmountCents: CentsSchema.positive().optional(),
    usedCardId: z.string().optional(),
    followedRecommendation: z.boolean().optional(),
  })
  .strict();

export const VerifySessionSchema = z
  .object({
    verified: z.boolean(),
  })
  .strict();
