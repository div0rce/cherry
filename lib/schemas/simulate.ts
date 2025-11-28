import { z } from 'zod';
import { CentsSchema, RewardCategorySchema } from './common';

export const SimulateRequestSchema = z.object({
  amountCents: CentsSchema.positive(),
  category: RewardCategorySchema,
  merchantName: z.string().min(1),
  simulationId: z.string().optional(),
  mccCode: z.number().int().optional(),
});
