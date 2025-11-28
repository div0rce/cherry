import { z } from 'zod';
import { CentsSchema } from './common';

export const ScanRequestSchema = z.object({
  merchantName: z.string().min(1),
  expectedAmountCents: CentsSchema.positive().optional(),
  category: z.string().optional(),
});
