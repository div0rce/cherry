import { z } from 'zod';
import { CentsSchema } from './common';
import { mccSchema } from './mcc';

export const ScanRequestSchema = z
  .object({
    merchantName: z.string().min(1),
    expectedAmountCents: CentsSchema.optional(),
    category: z.string().optional(),
    mccCode: mccSchema.optional().nullable(),
  })
  .strict();

export const ScanResponseSchema = z
  .object({
    merchantName: z.string().nullable().optional(),
    category: z.string().nullable(),
    amountCents: z.number().int().nonnegative(),
    bucket: z
      .object({
        name: z.string().nullable(),
        limitCents: z.number().int().nullable(),
        spentBeforeCents: z.number().int().nullable(),
        spentAfterCents: z.number().int().nullable(),
        remainingAfterCents: z.number().int().nullable(),
        strictMode: z.boolean(),
        wouldExceed: z.boolean(),
        coverageMode: z.string(),
        verdict: z.string(),
      })
      .strict()
      .nullable(),
    cardRecommendation: z
      .object({
        cardId: z.string().nullable(),
        cardNickname: z.string().nullable(),
        rewardMultiplier: z.number().nullable(),
        estimatedRewards: z.number().nullable(),
        verdict: z.string(),
      })
      .strict(),
    budgetVerdict: z.string(),
    cardVerdict: z.string(),
    overallVerdict: z.string(),
    cherryIncentive: z
      .object({
        pointsIfFollowed: z.number().int().nonnegative(),
        expiryMinutes: z.number().int().nonnegative(),
      })
      .strict(),
    engineDecision: z.unknown(),
  })
  .strict();
export type ScanResponse = z.infer<typeof ScanResponseSchema>;
