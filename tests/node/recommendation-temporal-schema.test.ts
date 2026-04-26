import * as assert from 'node:assert/strict';
import { z } from 'zod';
import {
  applyTemporalSchemaRefinements,
  ContingentRecommendationSchema,
  FutureRiskContextSchema,
  TemporalContextSchema,
} from '../../lib/schemas/recommendation-temporal.js';

const ResponseSchema = z
  .object({
    temporalContext: TemporalContextSchema,
    contingentRecommendation: ContingentRecommendationSchema,
    futureRiskContext: FutureRiskContextSchema,
  })
  .strict()
  .superRefine(applyTemporalSchemaRefinements);

const decisionTimeMs = new Date('2024-01-01T00:00:00Z').getTime();
const futureMs = decisionTimeMs + 60_000;

type TemporalResponse = z.infer<typeof ResponseSchema>;

const contingentRecommendation = {
  action: {
    kind: 'SCHEDULED_PAYDOWN' as const,
    debtId: 'debt-1',
    amountCents: 1_000,
    effectiveAtMs: futureMs,
  },
  message: 'Future scheduled paydown is not effective yet.',
  status: 'NOT_EFFECTIVE_YET' as const,
};

const futureRiskContext = {
  message: 'Future scheduled paydowns are not effective yet.',
  nextEffectiveAtMs: futureMs,
  eventCount: 1,
  totalScheduledAmountCents: 1_000,
};

function presentResponse(overrides: Partial<TemporalResponse> = {}): TemporalResponse {
  return {
    temporalContext: {
      modelMode: 'PRESENT_ONLY',
      decisionTimeMs,
      horizonEndMs: null,
      includesScheduledPaydowns: false,
      contingency: 'NONE',
      scheduledPaydownSourceStatus: 'AVAILABLE_EMPTY',
    },
    contingentRecommendation: null,
    futureRiskContext: null,
    ...overrides,
  };
}

function futureResponse(overrides: Partial<TemporalResponse> = {}): TemporalResponse {
  return {
    temporalContext: {
      modelMode: 'PRESENT_PLUS_FUTURE_EVENTS',
      decisionTimeMs,
      horizonEndMs: futureMs,
      includesScheduledPaydowns: true,
      contingency: 'REQUIRES_FUTURE_EVENTS',
      scheduledPaydownSourceStatus: 'AVAILABLE_ACTIVE',
    },
    contingentRecommendation,
    futureRiskContext: null,
    ...overrides,
  };
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function assertInvalid(name: string, value: TemporalResponse): void {
  const parsed = ResponseSchema.safeParse(value);
  assert.equal(parsed.success, false, name);
}

function run(): void {
  assert.equal(ResponseSchema.safeParse(presentResponse()).success, true);
  assert.equal(ResponseSchema.safeParse(futureResponse()).success, true);

  assertInvalid(
    'contingency = NONE with non-null contingentRecommendation',
    presentResponse({ contingentRecommendation })
  );
  assertInvalid(
    'contingency = NONE with non-null futureRiskContext',
    presentResponse({ futureRiskContext })
  );
  assertInvalid(
    'contingency = REQUIRES_FUTURE_EVENTS with both contingent fields null',
    futureResponse({
      temporalContext: {
        ...futureResponse().temporalContext,
        contingency: 'REQUIRES_FUTURE_EVENTS',
      },
      contingentRecommendation: null,
      futureRiskContext: null,
    })
  );
  assertInvalid(
    'modelMode = PRESENT_ONLY with includesScheduledPaydowns = true',
    presentResponse({
      temporalContext: {
        ...presentResponse().temporalContext,
        includesScheduledPaydowns: true,
      },
    })
  );
  assertInvalid(
    'modelMode = PRESENT_ONLY with horizonEndMs != null',
    presentResponse({
      temporalContext: {
        ...presentResponse().temporalContext,
        horizonEndMs: futureMs,
      },
    })
  );
  assertInvalid(
    'scheduledPaydownSourceStatus = AVAILABLE_EMPTY with modelMode = PRESENT_PLUS_FUTURE_EVENTS',
    futureResponse({
      temporalContext: {
        ...futureResponse().temporalContext,
        scheduledPaydownSourceStatus: 'AVAILABLE_EMPTY',
      },
    })
  );
  assertInvalid(
    'scheduledPaydownSourceStatus = AVAILABLE_NO_ACTIVE with modelMode = PRESENT_PLUS_FUTURE_EVENTS',
    futureResponse({
      temporalContext: {
        ...futureResponse().temporalContext,
        scheduledPaydownSourceStatus: 'AVAILABLE_NO_ACTIVE',
      },
    })
  );
  assertInvalid(
    'scheduledPaydownSourceStatus = UNAVAILABLE with modelMode = PRESENT_PLUS_FUTURE_EVENTS',
    futureResponse({
      temporalContext: {
        ...futureResponse().temporalContext,
        scheduledPaydownSourceStatus: 'UNAVAILABLE',
      },
    })
  );
  assertInvalid(
    'modelMode = PRESENT_PLUS_FUTURE_EVENTS with includesScheduledPaydowns = false',
    futureResponse({
      temporalContext: {
        ...futureResponse().temporalContext,
        includesScheduledPaydowns: false,
      },
    })
  );
  assertInvalid(
    'modelMode = PRESENT_PLUS_FUTURE_EVENTS with horizonEndMs = null',
    futureResponse({
      temporalContext: {
        ...futureResponse().temporalContext,
        horizonEndMs: null,
      },
    })
  );
  assertInvalid(
    'modelMode = PRESENT_PLUS_FUTURE_EVENTS with contingency = NONE',
    futureResponse({
      temporalContext: {
        ...futureResponse().temporalContext,
        contingency: 'NONE',
      },
    })
  );
  assertInvalid(
    'horizonEndMs <= decisionTimeMs',
    futureResponse({
      temporalContext: {
        ...futureResponse().temporalContext,
        horizonEndMs: decisionTimeMs,
      },
    })
  );
  assertInvalid(
    'scheduledPaydownSourceStatus = UNAVAILABLE with contingent fields non-null',
    presentResponse({
      temporalContext: {
        ...presentResponse().temporalContext,
        scheduledPaydownSourceStatus: 'UNAVAILABLE',
      },
      contingentRecommendation,
    })
  );
  assertInvalid(
    'scheduledPaydownSourceStatus = UNAVAILABLE with futureRiskContext non-null',
    presentResponse({
      temporalContext: {
        ...presentResponse().temporalContext,
        scheduledPaydownSourceStatus: 'UNAVAILABLE',
      },
      futureRiskContext,
    })
  );
  assertInvalid(
    'scheduledPaydownSourceStatus = AVAILABLE_EMPTY with includesScheduledPaydowns = true',
    presentResponse({
      temporalContext: {
        ...presentResponse().temporalContext,
        includesScheduledPaydowns: true,
      },
    })
  );
  assertInvalid(
    'scheduledPaydownSourceStatus = AVAILABLE_EMPTY with contingent fields non-null',
    presentResponse({ contingentRecommendation })
  );
  assertInvalid(
    'scheduledPaydownSourceStatus = AVAILABLE_NO_ACTIVE with includesScheduledPaydowns = true',
    presentResponse({
      temporalContext: {
        ...presentResponse().temporalContext,
        scheduledPaydownSourceStatus: 'AVAILABLE_NO_ACTIVE',
        includesScheduledPaydowns: true,
      },
    })
  );
  assertInvalid(
    'scheduledPaydownSourceStatus = AVAILABLE_NO_ACTIVE with contingent fields non-null',
    presentResponse({
      temporalContext: {
        ...presentResponse().temporalContext,
        scheduledPaydownSourceStatus: 'AVAILABLE_NO_ACTIVE',
      },
      contingentRecommendation,
    })
  );
  assertInvalid(
    'scheduledPaydownSourceStatus = AVAILABLE_ACTIVE with modelMode = PRESENT_ONLY',
    futureResponse({
      temporalContext: {
        ...futureResponse().temporalContext,
        modelMode: 'PRESENT_ONLY',
      },
    })
  );
  assertInvalid(
    'scheduledPaydownSourceStatus = AVAILABLE_ACTIVE with includesScheduledPaydowns = false',
    futureResponse({
      temporalContext: {
        ...futureResponse().temporalContext,
        includesScheduledPaydowns: false,
      },
    })
  );
  assertInvalid(
    'scheduledPaydownSourceStatus = AVAILABLE_ACTIVE with horizonEndMs = null',
    futureResponse({
      temporalContext: {
        ...futureResponse().temporalContext,
        horizonEndMs: null,
      },
    })
  );
  assertInvalid(
    'scheduledPaydownSourceStatus = AVAILABLE_ACTIVE with contingency = NONE',
    futureResponse({
      temporalContext: {
        ...futureResponse().temporalContext,
        contingency: 'NONE',
      },
    })
  );

  const nonFutureContingent = clone(contingentRecommendation);
  nonFutureContingent.action.effectiveAtMs = decisionTimeMs;
  assertInvalid(
    'contingent recommendation with effectiveAtMs <= decisionTimeMs',
    futureResponse({ contingentRecommendation: nonFutureContingent })
  );

  assertInvalid(
    'futureRiskContext with zero events',
    futureResponse({ futureRiskContext: { ...futureRiskContext, eventCount: 0 } })
  );
  assertInvalid(
    'futureRiskContext with zero amount',
    futureResponse({ futureRiskContext: { ...futureRiskContext, totalScheduledAmountCents: 0 } })
  );
  assertInvalid(
    'futureRiskContext with non-future next timestamp',
    futureResponse({ futureRiskContext: { ...futureRiskContext, nextEffectiveAtMs: decisionTimeMs } })
  );

  console.warn('node recommendation-temporal-schema: ok');
}

run();
