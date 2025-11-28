import { z } from 'zod';
import { CentsSchema } from './common';
import { mccSchema } from '@/lib/schemas/mcc';

export const ScanRequestSchema = z.object({
  merchantName: z.string().min(1),
  expectedAmountCents: CentsSchema.optional(),
  category: z.string().optional(),
  mccCode: mccSchema.optional().nullable(),
});
