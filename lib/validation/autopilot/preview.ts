import { z } from 'zod';
import { AuthorityReason } from '@/lib/authority/reasonCodes';
import { AUTOPILOT_REWARD_CATEGORIES } from '@/lib/autopilot/types';

// Single-source schemas for /api/autopilot/preview input/output; used by route, service, adapter, and tests.

const PositiveCentsSchema = z.number().int().positive();
const IsoDatetimeStringSchema = z.string().datetime();
const AutopilotSeveritySchema = z.enum(['positive', 'neutral', 'negative']);
const NonEmptyStringSchema = z.string().trim().min(1);
const PercentSchema = z.number().finite().min(0).max(100);
export const RewardStrengthLevelSchema = z
  .preprocess((value) => {
    if (typeof value === 'number') {
      if (!Number.isFinite(value) || !Number.isInteger(value)) return value;
      return String(value);
    }
    return value;
  }, z.enum(['1', '2', '3', '4']))
  .transform((v) => Number(v) as 1 | 2 | 3 | 4);
export type RewardStrengthLevel = z.infer<typeof RewardStrengthLevelSchema>;

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

const AutopilotUiBadgeSchema = z
  .object({
    severity: AutopilotSeveritySchema,
    label: NonEmptyStringSchema,
  })
  .strict();

const AutopilotUiCardLabelsSchema = z
  .object({
    recommended: NonEmptyStringSchema,
    alternate: NonEmptyStringSchema,
    caution: NonEmptyStringSchema,
    usualCardFallback: NonEmptyStringSchema,
  })
  .strict();

const AutopilotUiRewardStrengthSchema = z
  .object({
    label: NonEmptyStringSchema,
    level: RewardStrengthLevelSchema,
    strengthPercent: PercentSchema.optional(),
  })
  .strict();

const AutopilotUiImpactSchema = z
  .object({
    fallbackSegments: z
      .object({
        usedLabel: NonEmptyStringSchema,
        remainingLabel: NonEmptyStringSchema,
        otherLabel: NonEmptyStringSchema,
      })
      .strict(),
    bucketUsedTemplate: NonEmptyStringSchema,
    bucketRemainingTemplate: NonEmptyStringSchema,
  })
  .strict();

const AutopilotUiSectionsSchema = z
  .object({
    recommendation: NonEmptyStringSchema,
    alternatives: NonEmptyStringSchema,
    monthImpactTitle: NonEmptyStringSchema,
  })
  .strict();

const AutopilotUiCtasSchema = z
  .object({
    primaryTemplate: NonEmptyStringSchema,
    secondary: NonEmptyStringSchema,
  })
  .strict();

const AutopilotUiPanelCopySchema = z
  .object({
    idleTitle: NonEmptyStringSchema,
    idleBody: NonEmptyStringSchema,
    loadingTitle: NonEmptyStringSchema,
    loadingBody: NonEmptyStringSchema,
    loadingShimmerLines: z.number().int().min(0).max(12),
    errorTitle: NonEmptyStringSchema,
    errorBody: NonEmptyStringSchema,
    errorTimestampFallback: NonEmptyStringSchema,
    sectionSimulationEyebrow: NonEmptyStringSchema,
    unnamedMerchantFallback: NonEmptyStringSchema,
    simulationIssueTitle: NonEmptyStringSchema,
    showingPreviousResultNote: NonEmptyStringSchema,
    actionComingSoonNote: NonEmptyStringSchema,
    safetyLabel: NonEmptyStringSchema,
  })
  .strict();

const AutopilotUiExplanationSchema = z
  .object({
    primary: z.string(),
    secondary: z.array(z.string()),
    warnings: z.array(z.string()),
  })
  .strict();

const AutopilotUiBundleSchema = z
  .object({
    badge: AutopilotUiBadgeSchema,
    cardLabels: AutopilotUiCardLabelsSchema,
    rewardStrength: AutopilotUiRewardStrengthSchema,
    impact: AutopilotUiImpactSchema,
    sections: AutopilotUiSectionsSchema,
    ctas: AutopilotUiCtasSchema,
    explanation: AutopilotUiExplanationSchema,
    panel: AutopilotUiPanelCopySchema,
    formLabels: z
      .object({
        category: z.record(z.string(), NonEmptyStringSchema),
        timing: z.record(z.string(), NonEmptyStringSchema),
      })
      .strict(),
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

const AuthorityReasonSchema = z
  .object({
    code: z.nativeEnum(AuthorityReason),
    severity: z.number().int().min(0),
    detail: z.string(),
  })
  .strict();

const AuthorityDecisionSchema = z
  .object({
    version: z.literal('authority_v1'),
    verdict: z.enum(['ALLOW_SIMULATED', 'WARN_SIMULATED', 'FLAG_SIMULATED']),
    severity: z.number().int().min(0),
    reasons: z.array(AuthorityReasonSchema).nonempty(),
    explanation: z.string(),
    inputsVersion: z.string(),
    engineVersion: z.string().nullable(),
    counterfactuals: z.array(
      z
        .object({
          adjustment: z
            .object({
              amountCents: z.number().int().nonnegative().optional(),
              delayDays: z.number().int().nonnegative().optional(),
              bucketId: z.string().nullable().optional(),
            })
            .strict(),
          verdict: z.enum(['ALLOW_SIMULATED', 'WARN_SIMULATED', 'FLAG_SIMULATED']),
          severity: z.number().int().min(0),
          reasons: z.array(AuthorityReasonSchema).nonempty(),
          explanation: z.string(),
        })
        .strict()
    ),
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
    bucketImpact: AutopilotBucketImpactSchema.nullable(),
    reasonCode: z.string().trim().min(1),
    authority: AuthorityDecisionSchema,
    ui: AutopilotUiBundleSchema,
  })
  .strict();

export type AutopilotPreviewInput = z.infer<typeof AutopilotPreviewInputSchema>;
export type AutopilotPreviewOutput = z.infer<typeof AutopilotPreviewOutputSchema>;
export type AutopilotPreviewUiBundle = z.infer<typeof AutopilotUiBundleSchema>;
