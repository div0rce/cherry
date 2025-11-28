import { z } from 'zod';
import { CentsSchema } from './common';
import { mccSchema } from '@/lib/schemas/mcc';
const vineOrderSourceValues = ['VINE_SIM', 'VINE_DEVICE', 'APP_SCAN'] as const;

export const OrderContextSchema = z.object({
  deviceId: z.string().min(1),
  storeId: z.string().min(1).optional(),
  terminalId: z.string().min(1).optional(),
  orderId: z.string().min(1).optional(),
  merchantName: z.string().optional(),
  amountCents: CentsSchema,
  currency: z.literal('USD').optional(),
  mccCode: mccSchema.optional().nullable(),
  timestamp: z.number().int(),
  nonce: z.string().optional(),
  source: z.enum(vineOrderSourceValues),
});
