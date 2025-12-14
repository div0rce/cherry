import type { BucketRuntime } from '@/lib/buckets-runtime';
import { z } from 'zod';

export const AUTOPILOT_REWARD_CATEGORIES = [
  'DINING',
  'GROCERIES',
  'GAS',
  'TRAVEL',
  'AIR_TRAVEL',
  'HOTEL',
  'CAR_RENTAL',
  'ONLINE_SHOPPING',
  'ENTERTAINMENT',
  'HEALTH',
  'UTILITIES',
  'GENERAL_MERCHANDISE',
  'OTHER',
] as const;

export type AutopilotRewardCategory = (typeof AUTOPILOT_REWARD_CATEGORIES)[number];

export type AutopilotDecisionStatus = 'ok' | 'blocked' | 'fallback';

export type AutopilotRecommendedCard = {
  id: string;
  label: string;
  issuer: string | null;
  network: string | null;
};

export type AutopilotBucketImpact = {
  bucketId: string;
  name: string | null;
  remainingCents: number | null;
  spentCents: number | null;
};

export type AutopilotPreviewInput = {
  merchant: string;
  amountCents: number;
  occurredAt?: string | undefined;
  category?: AutopilotRewardCategory | undefined;
};

export type AutopilotPreviewOutput = {
  decisionId: string;
  merchant: string;
  amountCents: number;
  occurredAt: string;
  status: AutopilotDecisionStatus;
  recommendedCard: AutopilotRecommendedCard | null;
  expectedBenefitCents: number;
  explanation: {
    primary: string;
    secondary: string[];
    warnings: string[];
  };
  bucketImpact: AutopilotBucketImpact | null;
  reasonCode: string;
};

export type AutopilotCommitInput = {
  decisionId: string;
  merchant: string;
  amountCents: number;
  cardId: string;
  occurredAt: string;
  category?: AutopilotRewardCategory | undefined;
  userNote?: string | undefined;
};

export type AutopilotCommitResult = {
  decisionId: string;
  transactionId?: string;
  sessionId?: string;
  bucket: BucketRuntime | null;
  status: 'created' | 'already_exists';
};

const PositiveCentsSchema = z.number().int().positive();

export const AutopilotPreviewInputSchema = z
  .object({
    merchant: z.string().trim().min(1),
    amountCents: PositiveCentsSchema,
    occurredAt: z.string().datetime().optional(),
    category: z.enum(AUTOPILOT_REWARD_CATEGORIES).optional(),
  })
  .strict();

export const AutopilotCommitInputSchema = z
  .object({
    decisionId: z.string().trim().min(1),
    merchant: z.string().trim().min(1),
    amountCents: PositiveCentsSchema,
    cardId: z.string().trim().min(1),
    occurredAt: z.string().datetime(),
    category: z.enum(AUTOPILOT_REWARD_CATEGORIES).optional(),
    userNote: z.string().trim().max(500).optional(),
  })
  .strict();

export const AutopilotPreviewOutputSchema = z
  .object({
    decisionId: z.string().trim().min(1),
    merchant: z.string().trim().min(1),
    amountCents: z.number().int().nonnegative(),
    occurredAt: z.string().datetime(),
    status: z.enum(['ok', 'blocked', 'fallback']),
    recommendedCard: z
      .object({
        id: z.string().trim().min(1),
        label: z.string().trim().min(1),
        issuer: z.string().nullable(),
        network: z.string().nullable(),
      })
      .strict()
      .nullable(),
    expectedBenefitCents: z.number().int().nonnegative(),
    explanation: z
      .object({
        primary: z.string(),
        secondary: z.array(z.string()),
        warnings: z.array(z.string()),
      })
      .strict(),
    bucketImpact: z
      .object({
        bucketId: z.string().trim().min(1),
        name: z.string().nullable(),
        remainingCents: z.number().int().nullable(),
        spentCents: z.number().int().nullable(),
      })
      .strict()
      .nullable(),
    reasonCode: z.string(),
  })
  .strict();

export class AutopilotServiceError extends Error {
  status: number;
  code: string;
  detail?: unknown;

  constructor(message: string, status = 400, code = 'BAD_REQUEST', detail?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}
