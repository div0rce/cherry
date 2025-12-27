import { z } from 'zod';
import { RewardCategorySchema } from './common';

const RewardRuleSchema = z
  .object({
    category: RewardCategorySchema,
    multiplier: z.number().positive().optional(),
    cashbackPercent: z.number().positive().optional(),
    capAmountCents: z.number().int().nonnegative().nullable().optional(),
  })
  .strict();

export const CardCreateSchema = z
  .object({
    nickname: z.string().min(1),
    issuer: z.string().min(1),
    network: z.string().min(1),
    isCredit: z.boolean().optional(),
    annualFee: z.number().nullable().optional(),
    rewardRules: z.array(RewardRuleSchema).optional(),
  })
  .strict();

export const CardDeleteSchema = z
  .object({
    cardId: z.string().min(1),
  })
  .strict();

export const CardUpdateSchema = z
  .object({
    nickname: z.string().min(1),
    issuer: z.string().min(1),
    network: z.string().min(1),
    isCredit: z.boolean(),
    annualFee: z.number().nullable().optional(),
  })
  .strict();

export const RewardRuleCreateSchema = RewardRuleSchema.extend({
  capAmountCents: z.number().int().positive().optional(),
}).strict();

export const RewardRuleDeleteSchema = z
  .object({
    rewardRuleId: z.string().min(1),
  })
  .strict();

export const RewardRuleUpdateSchema = RewardRuleSchema.extend({
  rewardRuleId: z.string().min(1),
}).strict();
