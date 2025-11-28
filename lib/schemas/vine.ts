import { z } from 'zod';
import { CentsSchema } from './common';
import { VineOrderSource } from '@/lib/enums';

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
  source: z.enum([
    VineOrderSource.VINE_SIM,
    VineOrderSource.VINE_DEVICE,
    VineOrderSource.APP_SCAN,
  ]),
});
