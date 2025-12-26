import { z } from 'zod';
import { CentsSchema, RewardCategorySchema } from './common.js';

export const SimulateRequestSchema = z
  .object({
    amountCents: CentsSchema.positive(),
    category: RewardCategorySchema,
    merchantName: z.string().trim().min(1),
    simulationId: z.string().optional(),
    mccCode: z.number().int().optional().nullable(),
    commit: z.boolean().optional(),
  })
  .strict();
