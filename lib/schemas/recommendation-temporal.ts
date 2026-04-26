import { z } from 'zod';

export const ScheduledPaydownSourceStatusSchema = z.enum([
  'UNAVAILABLE',
  'AVAILABLE_EMPTY',
  'AVAILABLE_NO_ACTIVE',
  'AVAILABLE_ACTIVE',
]);

export const TemporalContextSchema = z
  .object({
    modelMode: z.enum(['PRESENT_ONLY', 'PRESENT_PLUS_FUTURE_EVENTS']),
    decisionTimeMs: z.number().int().nonnegative(),
    horizonEndMs: z.number().int().nonnegative().nullable(),
    includesScheduledPaydowns: z.boolean(),
    contingency: z.enum(['NONE', 'REQUIRES_FUTURE_EVENTS']),
    scheduledPaydownSourceStatus: ScheduledPaydownSourceStatusSchema,
  })
  .strict();

export const ContingentRecommendationSchema = z
  .object({
    action: z
      .object({
        kind: z.literal('SCHEDULED_PAYDOWN'),
        debtId: z.string().min(1),
        amountCents: z.number().int().positive(),
        effectiveAtMs: z.number().int().nonnegative(),
      })
      .strict(),
    message: z.string().min(1),
    status: z.literal('NOT_EFFECTIVE_YET'),
  })
  .strict()
  .nullable();

export const FutureRiskContextSchema = z
  .object({
    message: z.string().min(1),
    nextEffectiveAtMs: z.number().int().nonnegative().nullable(),
    eventCount: z.number().int().nonnegative(),
    totalScheduledAmountCents: z.number().int().nonnegative(),
  })
  .strict()
  .nullable();

export function applyTemporalSchemaRefinements<
  T extends {
    temporalContext: z.infer<typeof TemporalContextSchema>;
    contingentRecommendation: z.infer<typeof ContingentRecommendationSchema>;
    futureRiskContext: z.infer<typeof FutureRiskContextSchema>;
  },
>(value: T, ctx: z.RefinementCtx): void {
  const temporalContext = value.temporalContext;
  const contingentRecommendation = value.contingentRecommendation;
  const futureRiskContext = value.futureRiskContext;

  function addTemporalIssue(message: string, path: (string | number)[]): void {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message,
      path,
    });
  }

  if (temporalContext.contingency === 'NONE' && contingentRecommendation !== null) {
    addTemporalIssue(
      'contingentRecommendation must be null when contingency is NONE.',
      ['contingentRecommendation']
    );
  }

  if (temporalContext.contingency === 'NONE' && futureRiskContext !== null) {
    addTemporalIssue(
      'futureRiskContext must be null when contingency is NONE.',
      ['futureRiskContext']
    );
  }

  if (
    temporalContext.contingency === 'REQUIRES_FUTURE_EVENTS' &&
    contingentRecommendation === null &&
    futureRiskContext === null
  ) {
    addTemporalIssue(
      'REQUIRES_FUTURE_EVENTS requires at least one contingent future surface.',
      ['temporalContext', 'contingency']
    );
  }

  if (
    contingentRecommendation !== null &&
    contingentRecommendation.action.effectiveAtMs <= temporalContext.decisionTimeMs
  ) {
    addTemporalIssue('Contingent recommendations must be future-only.', [
      'contingentRecommendation',
      'action',
      'effectiveAtMs',
    ]);
  }

  if (
    temporalContext.modelMode === 'PRESENT_ONLY' &&
    temporalContext.includesScheduledPaydowns === true
  ) {
    addTemporalIssue(
      'PRESENT_ONLY responses cannot include evaluated scheduled paydowns.',
      ['temporalContext', 'includesScheduledPaydowns']
    );
  }

  if (
    temporalContext.modelMode === 'PRESENT_ONLY' &&
    temporalContext.horizonEndMs !== null
  ) {
    addTemporalIssue('PRESENT_ONLY responses cannot carry a horizonEndMs.', [
      'temporalContext',
      'horizonEndMs',
    ]);
  }

  if (temporalContext.modelMode === 'PRESENT_PLUS_FUTURE_EVENTS') {
    if (temporalContext.scheduledPaydownSourceStatus !== 'AVAILABLE_ACTIVE') {
      addTemporalIssue(
        'PRESENT_PLUS_FUTURE_EVENTS requires AVAILABLE_ACTIVE scheduled paydowns.',
        ['temporalContext', 'scheduledPaydownSourceStatus']
      );
    }
    if (temporalContext.includesScheduledPaydowns !== true) {
      addTemporalIssue(
        'PRESENT_PLUS_FUTURE_EVENTS requires includesScheduledPaydowns = true.',
        ['temporalContext', 'includesScheduledPaydowns']
      );
    }
    if (temporalContext.horizonEndMs === null) {
      addTemporalIssue('PRESENT_PLUS_FUTURE_EVENTS requires non-null horizonEndMs.', [
        'temporalContext',
        'horizonEndMs',
      ]);
    }
    if (temporalContext.contingency !== 'REQUIRES_FUTURE_EVENTS') {
      addTemporalIssue(
        'PRESENT_PLUS_FUTURE_EVENTS requires contingency = REQUIRES_FUTURE_EVENTS.',
        ['temporalContext', 'contingency']
      );
    }
  }

  if (
    temporalContext.horizonEndMs !== null &&
    temporalContext.horizonEndMs <= temporalContext.decisionTimeMs
  ) {
    addTemporalIssue('horizonEndMs must be greater than decisionTimeMs.', [
      'temporalContext',
      'horizonEndMs',
    ]);
  }

  if (
    temporalContext.scheduledPaydownSourceStatus === 'UNAVAILABLE' &&
    (contingentRecommendation !== null || futureRiskContext !== null)
  ) {
    addTemporalIssue(
      'Unavailable scheduled paydown sources cannot populate contingent surfaces.',
      ['temporalContext', 'scheduledPaydownSourceStatus']
    );
  }

  if (
    temporalContext.scheduledPaydownSourceStatus === 'UNAVAILABLE' &&
    temporalContext.includesScheduledPaydowns === true
  ) {
    addTemporalIssue('UNAVAILABLE responses cannot report evaluated scheduled paydowns.', [
      'temporalContext',
      'includesScheduledPaydowns',
    ]);
  }

  if (
    temporalContext.scheduledPaydownSourceStatus === 'AVAILABLE_EMPTY' &&
    temporalContext.includesScheduledPaydowns === true
  ) {
    addTemporalIssue(
      'AVAILABLE_EMPTY responses cannot report evaluated scheduled paydowns.',
      ['temporalContext', 'includesScheduledPaydowns']
    );
  }

  if (
    temporalContext.scheduledPaydownSourceStatus === 'AVAILABLE_EMPTY' &&
    (contingentRecommendation !== null || futureRiskContext !== null)
  ) {
    addTemporalIssue('AVAILABLE_EMPTY responses cannot populate contingent surfaces.', [
      'temporalContext',
      'scheduledPaydownSourceStatus',
    ]);
  }

  if (
    temporalContext.scheduledPaydownSourceStatus === 'AVAILABLE_NO_ACTIVE' &&
    temporalContext.includesScheduledPaydowns === true
  ) {
    addTemporalIssue(
      'AVAILABLE_NO_ACTIVE responses cannot report evaluated scheduled paydowns.',
      ['temporalContext', 'includesScheduledPaydowns']
    );
  }

  if (
    temporalContext.scheduledPaydownSourceStatus === 'AVAILABLE_NO_ACTIVE' &&
    (contingentRecommendation !== null || futureRiskContext !== null)
  ) {
    addTemporalIssue('AVAILABLE_NO_ACTIVE responses cannot populate contingent surfaces.', [
      'temporalContext',
      'scheduledPaydownSourceStatus',
    ]);
  }

  if (
    temporalContext.scheduledPaydownSourceStatus === 'AVAILABLE_ACTIVE' &&
    temporalContext.modelMode === 'PRESENT_ONLY'
  ) {
    addTemporalIssue('AVAILABLE_ACTIVE responses must use future-events model mode.', [
      'temporalContext',
      'modelMode',
    ]);
  }

  if (
    temporalContext.scheduledPaydownSourceStatus === 'AVAILABLE_ACTIVE' &&
    temporalContext.includesScheduledPaydowns === false
  ) {
    addTemporalIssue('AVAILABLE_ACTIVE responses must include scheduled paydowns.', [
      'temporalContext',
      'includesScheduledPaydowns',
    ]);
  }

  if (
    temporalContext.scheduledPaydownSourceStatus === 'AVAILABLE_ACTIVE' &&
    temporalContext.horizonEndMs === null
  ) {
    addTemporalIssue('AVAILABLE_ACTIVE responses must carry horizonEndMs.', [
      'temporalContext',
      'horizonEndMs',
    ]);
  }

  if (
    temporalContext.scheduledPaydownSourceStatus === 'AVAILABLE_ACTIVE' &&
    temporalContext.contingency !== 'REQUIRES_FUTURE_EVENTS'
  ) {
    addTemporalIssue('AVAILABLE_ACTIVE responses must require future events.', [
      'temporalContext',
      'contingency',
    ]);
  }

  if (futureRiskContext !== null) {
    if (futureRiskContext.eventCount <= 0) {
      addTemporalIssue('futureRiskContext.eventCount must be positive.', [
        'futureRiskContext',
        'eventCount',
      ]);
    }
    if (futureRiskContext.totalScheduledAmountCents <= 0) {
      addTemporalIssue('futureRiskContext.totalScheduledAmountCents must be positive.', [
        'futureRiskContext',
        'totalScheduledAmountCents',
      ]);
    }
    if (
      futureRiskContext.nextEffectiveAtMs === null ||
      futureRiskContext.nextEffectiveAtMs <= temporalContext.decisionTimeMs
    ) {
      addTemporalIssue('futureRiskContext.nextEffectiveAtMs must be future-only.', [
        'futureRiskContext',
        'nextEffectiveAtMs',
      ]);
    }
  }
}
