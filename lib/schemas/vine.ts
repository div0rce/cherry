import { z } from 'zod';
import { CentsSchema } from './common';

export const OrderContextSchema = z.object({
  deviceId: z.string().min(1),
  storeId: z.string().min(1).optional(),
  terminalId: z.string().min(1).optional(),
  orderId: z.string().min(1).optional(),
  merchantName: z.string().optional(),
  amountCents: CentsSchema,
  currency: z.literal('USD').optional(),
  mccCode: z.number().int().optional().nullable(),
  timestamp: z.number().int(),
  nonce: z.string().optional(),
  source: z.enum(['VINE_SIM', 'VINE_DEVICE', 'APP_SCAN']),
});
