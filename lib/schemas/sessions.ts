import { z } from 'zod';
import { CentsSchema } from './common.js';
import {
  applyTemporalSchemaRefinements,
  ContingentRecommendationSchema,
  FutureRiskContextSchema,
  TemporalContextSchema,
} from './recommendation-temporal.js';

export const CreateSessionSchema = z
  .object({
    merchantName: z.string().min(1),
    amountCents: CentsSchema.positive(),
    category: z.string().optional(),
    currency: z.string().min(1).optional(),
    deviceId: z.string().optional(),
    storeId: z.string().optional(),
    terminalId: z.string().optional(),
    orderId: z.string().optional(),
    mccCode: z.number().int().optional(),
  })
  .strict();

export const ConfirmSessionSchema = z
  .object({
    actualAmountCents: CentsSchema.positive().optional(),
    usedCardId: z.string().optional(),
    followedRecommendation: z.boolean().optional(),
  })
  .strict();

export const VerifySessionSchema = z
  .object({
    verified: z.boolean(),
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

const SessionErrorSchema = z
  .object({
    code: z.string(),
    message: z.string(),
  })
  .strict();

export const CreateSessionSuccessResponseSchema = z
  .object({
    sessionId: z.string(),
    orderToken: z.string(),
    expiresAt: z.string(),
    source: z.string(),
    decision: z.unknown(),
    capabilities: EngineCapabilitiesSchema,
    degraded: EngineDegradedSchema,
    degradation: EngineDegradationSchema,
    temporalContext: TemporalContextSchema,
    contingentRecommendation: ContingentRecommendationSchema,
    futureRiskContext: FutureRiskContextSchema,
  })
  .strict();

export const CreateSessionFallbackResponseSchema = z
  .object({
    sessionId: z.null(),
    orderToken: z.null(),
    expiresAt: z.null(),
    source: z.string(),
    error: SessionErrorSchema,
    capabilities: EngineCapabilitiesSchema,
    degraded: EngineDegradedSchema,
    degradation: EngineDegradationSchema,
    temporalContext: TemporalContextSchema,
    contingentRecommendation: ContingentRecommendationSchema,
    futureRiskContext: FutureRiskContextSchema,
  })
  .strict();

export const CreateSessionResponseSchema = z.union([
  CreateSessionSuccessResponseSchema,
  CreateSessionFallbackResponseSchema,
]).superRefine(applyTemporalSchemaRefinements);

export type CreateSessionResponse = z.infer<typeof CreateSessionResponseSchema>;
