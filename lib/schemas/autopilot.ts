import { z } from 'zod';

const AutopilotBucketDeltaSchema = z
  .object({
    bucketId: z.string().trim().min(1),
    newSpentCents: z.number().int(),
    newRemainingCents: z.number().int(),
  })
  .strict();

export const AutopilotDecisionSchema = z
  .object({
    kind: z.enum(['OK', 'BLOCKED', 'FALLBACK']),
    cardId: z.string().trim().min(1).nullable(),
    reasonCode: z.string(),
    userFacingMessage: z.string(),
    expectedMonetaryBenefitCents: z.number().int().nonnegative(),
    bucketDelta: AutopilotBucketDeltaSchema.nullable(),
  })
  .strict();

export const AutopilotPreviewRequest = z
  .object({
    merchant: z.string().trim().min(1),
    amountCents: z.number().int().positive(),
  })
  .strict();

export const AutopilotCommitRequest = z
  .object({
    merchant: z.string().trim().min(1),
    amountCents: z.number().int().positive(),
    cardId: z.string().trim().min(1),
    occurredAt: z.string().datetime(),
  })
  .strict();

export type AutopilotDecisionResponse = z.infer<typeof AutopilotDecisionSchema>;
