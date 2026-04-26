import { z } from 'zod';
import { CentsSchema } from './common.js';
import { mccSchema } from './mcc.js';
import {
  applyTemporalSchemaRefinements,
  ContingentRecommendationSchema,
  FutureRiskContextSchema,
  TemporalContextSchema,
} from './recommendation-temporal.js';

export const ScanRequestSchema = z
  .object({
    merchantName: z.string().min(1),
    expectedAmountCents: CentsSchema.optional(),
    category: z.string().optional(),
    mccCode: mccSchema.optional().nullable(),
  })
  .strict();

const EngineCapabilitySchema = z
  .object({
    available: z.boolean(),
    reason: z.string(),
  })
  .strict();

const EngineCapabilitiesSchema = z.record(z.string(), EngineCapabilitySchema);

const EngineDegradedSchema = z
  .object({
    essentialProtection: z.boolean(),
    debtPressure: z.boolean(),
    liquidity: z.boolean(),
    utilization: z.boolean(),
  })
  .strict();

const EngineDegradationSchema = z
  .object({
    code: z.literal('CREDIT_ACTIONS_EXCLUDED_UNRESOLVABLE_CREDIT_LIABILITY'),
    message: z.string(),
  })
  .strict()
  .nullable();

const ScanErrorSchema = z
  .object({
    code: z.string(),
    message: z.string(),
  })
  .strict();

export const ScanSuccessResponseSchema = z
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
        rewardUnit: z.enum(['cashback_cents', 'issuer_points']).nullable(),
        rewardRate: z.number().nullable(),
        rewardPoints: z.number().int().nullable(),
        rewardValueCents: z.number().int().nullable(),
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
    decision: z.unknown(),
    capabilities: EngineCapabilitiesSchema,
    degraded: EngineDegradedSchema,
    degradation: EngineDegradationSchema,
    authority: z.unknown().nullable(),
    temporalContext: TemporalContextSchema,
    contingentRecommendation: ContingentRecommendationSchema,
    futureRiskContext: FutureRiskContextSchema,
  })
  .strict();

export const ScanFallbackResponseSchema = z
  .object({
    error: ScanErrorSchema,
    decision: z.null(),
    capabilities: EngineCapabilitiesSchema,
    degraded: EngineDegradedSchema,
    degradation: EngineDegradationSchema,
    authority: z.unknown().nullable(),
    temporalContext: TemporalContextSchema,
    contingentRecommendation: ContingentRecommendationSchema,
    futureRiskContext: FutureRiskContextSchema,
  })
  .strict();

export const ScanResponseSchema = z.union([
  ScanSuccessResponseSchema,
  ScanFallbackResponseSchema,
]).superRefine(applyTemporalSchemaRefinements);

export type ScanSuccessResponse = z.infer<typeof ScanSuccessResponseSchema>;
export type ScanFallbackResponse = z.infer<typeof ScanFallbackResponseSchema>;
export type ScanResponse = z.infer<typeof ScanResponseSchema>;

export function isScanSuccessResponse(response: ScanResponse): response is ScanSuccessResponse {
  return response.decision !== null;
}
