import { z } from 'zod';
import { CentsSchema, RewardCategorySchema } from './common.js';
import {
  applyTemporalSchemaRefinements,
  ContingentRecommendationSchema,
  FutureRiskContextSchema,
  TemporalContextSchema,
} from './recommendation-temporal.js';

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

const SimulationErrorSchema = z
  .object({
    code: z.string(),
    message: z.string(),
  })
  .strict();

const NonNullUnknownSchema = z.unknown().refine((value) => value !== null);

const SimulateResponseBaseSchema = z
  .object({
    simulationId: z.string(),
    capabilities: EngineCapabilitiesSchema,
    degraded: EngineDegradedSchema,
    degradation: EngineDegradationSchema,
    authority: z.unknown().nullable(),
    committed: z.boolean(),
    temporalContext: TemporalContextSchema,
    contingentRecommendation: ContingentRecommendationSchema,
    futureRiskContext: FutureRiskContextSchema,
  })
  .strict();

export const SimulateCardSuccessResponseSchema = SimulateResponseBaseSchema.extend({
  transaction: NonNullUnknownSchema,
  decision: NonNullUnknownSchema,
});

export const SimulateNonCardSuccessResponseSchema = SimulateResponseBaseSchema.extend({
  transaction: z.null(),
  decision: NonNullUnknownSchema,
});

export const SimulateFallbackResponseSchema = SimulateResponseBaseSchema.extend({
  transaction: z.null(),
  decision: z.null(),
  error: SimulationErrorSchema,
});

export const SimulateResponseSchema = z.union([
  SimulateCardSuccessResponseSchema,
  SimulateNonCardSuccessResponseSchema,
  SimulateFallbackResponseSchema,
]).superRefine((value, ctx) => {
  applyTemporalSchemaRefinements(value, ctx);
  const decisionCardId = extractNestedString(value.decision, ['card', 'cardId']);
  const transactionChosenCardId = extractNestedString(value.transaction, ['chosenCardId']);

  if (value.committed === true && value.decision === null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Committed simulate response cannot carry decision: null.',
      path: ['decision'],
    });
  }

  if (value.committed === true && value.transaction === null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Committed simulate response cannot carry transaction: null.',
      path: ['transaction'],
    });
  }

  if (value.transaction !== null && decisionCardId == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Card-backed success cannot carry null card fields.',
      path: ['decision', 'card', 'cardId'],
    });
  }

  if (value.transaction !== null && transactionChosenCardId == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Card-backed success cannot carry null chosenCardId.',
      path: ['transaction', 'chosenCardId'],
    });
  }

  if (value.decision === null && value.transaction !== null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Neutral/no-decision responses cannot carry card-backed success fields.',
      path: ['transaction'],
    });
  }
});

function extractNestedString(
  value: unknown,
  path: string[]
): string | null {
  let current: unknown = value;
  for (const segment of path) {
    if (current == null || typeof current !== 'object' || !(segment in current)) {
      return null;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return typeof current === 'string' && current.trim().length > 0 ? current : null;
}

export type SimulateResponse = z.infer<typeof SimulateResponseSchema>;
