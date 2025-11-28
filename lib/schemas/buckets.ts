import { z } from 'zod';
import { RewardCategorySchema, CentsSchema } from './common';

export const BucketCreateSchema = z.object({
  name: z.string().min(1),
  period: z.enum(['WEEKLY', 'MONTHLY']),
  budgetAmountCents: CentsSchema.positive(),
  currentAmountCents: CentsSchema.nonnegative().optional(),
  strictMode: z.boolean().optional(),
  category: RewardCategorySchema,
});

export const BucketDeleteSchema = z.object({
  bucketId: z.string().min(1),
});
