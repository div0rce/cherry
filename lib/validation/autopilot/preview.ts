import { z } from 'zod';
import { AUTOPILOT_REWARD_CATEGORIES } from '@/lib/autopilot/types';

// Single-source schemas for /api/autopilot/preview input/output; used by route, service, adapter, and tests.

const PositiveCentsSchema = z.number().int().positive();
const IsoDatetimeStringSchema = z.string().datetime();

const AutopilotRecommendedCardSchema = z
  .object({
    id: z.string().trim().min(1),
    label: z.string().trim().min(1),
    issuer: z.string().nullable(),
    network: z.string().nullable(),
  })
  .strict();

const AutopilotBucketImpactSchema = z
  .object({
    bucketId: z.string().trim().min(1),
    name: z.string().trim().min(1).nullable(),
    remainingCents: z.number().int(),
    spentCents: z.number().int(),
  })
  .strict();

export const AutopilotPreviewInputSchema = z
  .object({
    merchant: z.string().trim().min(1),
    amountCents: PositiveCentsSchema,
    occurredAt: IsoDatetimeStringSchema.optional(),
    category: z.enum(AUTOPILOT_REWARD_CATEGORIES),
  })
  .strict();

export const AutopilotPreviewOutputSchema = z
  .object({
    decisionId: z.string().trim().min(1),
    merchant: z.string().trim().min(1),
    amountCents: z.number().int().nonnegative(),
    occurredAt: IsoDatetimeStringSchema,
    status: z.enum(['ok', 'blocked', 'fallback']),
    recommendedCard: AutopilotRecommendedCardSchema.nullable(),
    expectedBenefitCents: z.number().int().nonnegative(),
    explanation: z
      .object({
        primary: z.string(),
        secondary: z.array(z.string()),
        warnings: z.array(z.string()),
      })
      .strict(),
    bucketImpact: AutopilotBucketImpactSchema.nullable(),
    reasonCode: z.string().trim().min(1),
  })
  .strict();

export type AutopilotPreviewInput = z.infer<typeof AutopilotPreviewInputSchema>;
export type AutopilotPreviewOutput = z.infer<typeof AutopilotPreviewOutputSchema>;
