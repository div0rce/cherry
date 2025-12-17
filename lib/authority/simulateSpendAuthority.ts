// authority_v1 — frozen. Any semantic change requires authority_v2.
import { createHash } from 'crypto';
import {
  CategoryBudgetMode,
  CherryPointLedgerStatus,
  DailyStateStatus,
  RewardCategory,
  VerificationStatus,
  type Bucket,
  type CategoryPreference,
} from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { applyInMemoryRollover } from '@/lib/buckets/periods';
import { toBucketRuntime, type BucketRuntime } from '@/lib/buckets-runtime';
import { AuthorityReason } from '@/lib/authority/reasonCodes';
import { getReasonSeverity, type AuthoritySurface } from '@/lib/authority/config';

const ENGINE_VERSION =
  process.env['VERCEL_GIT_COMMIT_SHA'] ??
  process.env['COMMIT_SHA'] ??
  process.env['NEXT_PUBLIC_SITE_VERSION'] ??
  null;

export type SimulatedAuthorityVerdict = 'ALLOW_SIMULATED' | 'WARN_SIMULATED' | 'FLAG_SIMULATED';

export type SimulatedAuthorityReason = {
  code: AuthorityReason;
  severity: number;
  detail: string;
};

export type SimulatedAuthorityDecision = {
  version: 'authority_v1';
  verdict: SimulatedAuthorityVerdict;
  severity: number;
  reasons: SimulatedAuthorityReason[];
  explanation: string;
  inputsVersion: string;
  engineVersion: string | null;
  counterfactuals: CounterfactualAuthorityResult[];
};

export type SimulateSpendParams = {
  userId: string;
  amountCents: number;
  category: RewardCategory;
  surface: 'autopilot' | 'vine' | 'simulate' | 'scan';
  counterfactuals?: CounterfactualAuthorityRequest[];
};

export type CounterfactualAuthorityRequest = {
  amountCents?: number;
  delayDays?: number;
  bucketId?: string | null;
};

export type CounterfactualAuthorityResult = {
  adjustment: CounterfactualAuthorityRequest;
  verdict: SimulatedAuthorityVerdict;
  severity: number;
  reasons: SimulatedAuthorityReason[];
  explanation: string;
};

export type AuthorityPrismaClient = {
  dailyState: {
    findFirst: typeof prisma.dailyState.findFirst;
  };
  bucket: {
    findMany: typeof prisma.bucket.findMany;
  };
  categoryPreference: {
    findUnique: typeof prisma.categoryPreference.findUnique;
  };
  recommendationSession: {
    count: typeof prisma.recommendationSession.count;
  };
  cherryPointLedger: {
    aggregate: typeof prisma.cherryPointLedger.aggregate;
  };
};

type DecisionEventClient = Pick<typeof prisma, 'decisionEvent'>;

type AuthorityInputs = {
  userId: string;
  amountCents: number;
  category: RewardCategory;
  surface: SimulateSpendParams['surface'];
  dailyState:
    | {
        status: DailyStateStatus;
        safeToSpendCents: number | null;
        inputsVersion: string | null;
      }
    | null;
  categoryPreferenceMode: CategoryPreference['mode'] | null;
  pendingSessions: number;
  pendingPoints: number;
  counterfactuals: CounterfactualAuthorityRequest[];
  buckets: Array<{
    id: string;
    category: RewardCategory;
    budgetAmount: number;
    remainingCents: number;
    strictMode: boolean;
    periodEnd: string | null;
  }>;
};

type EvaluationContext = {
  amountCents: number;
  category: RewardCategory;
  bucket: BucketRuntime | null;
  dailyStateStatus: DailyStateStatus;
  safeToSpendCents: number | null;
  categoryPreferenceMode: CategoryPreference['mode'] | null;
  pendingSessions: number;
  pendingPoints: number;
  delayDays: number;
  surface: AuthoritySurface;
};

function computeInputsVersion(inputs: AuthorityInputs): string {
  const hash = createHash('sha256');
  hash.update(
    JSON.stringify({
      ...inputs,
      buckets: inputs.buckets
        .map((bucket) => ({
          ...bucket,
          budgetAmount: Math.max(0, Math.floor(bucket.budgetAmount)),
          remainingCents: Math.max(0, Math.floor(bucket.remainingCents)),
        }))
        .sort((a, b) => a.id.localeCompare(b.id)),
      counterfactuals: inputs.counterfactuals.map((c) => ({
        amountCents: c.amountCents ?? null,
        delayDays: c.delayDays ?? null,
        bucketId: c.bucketId ?? null,
      })),
    })
  );
  return hash.digest('hex');
}

function evaluateReasons(ctx: EvaluationContext): SimulatedAuthorityReason[] {
  const reasons: SimulatedAuthorityReason[] = [];
  const remainingBaseline = ctx.bucket?.remainingCents ?? ctx.safeToSpendCents ?? null;
  const categoryRestricted = ctx.categoryPreferenceMode === CategoryBudgetMode.UNBUDGETED;
  const bucketExhausted = ctx.bucket !== null && ctx.bucket.remainingCents <= 0;
  const verificationPending = ctx.pendingSessions > 0 || ctx.pendingPoints > 0;
  const essentialBufferLow =
    ctx.dailyStateStatus === DailyStateStatus.TIGHT ||
    (ctx.bucket !== null && ctx.bucket.remainingCents > 0 && ctx.bucket.remainingCents <= 2000);
  const amountSpike =
    remainingBaseline !== null &&
    remainingBaseline > 0 &&
    ctx.amountCents >= Math.max(Math.floor(remainingBaseline * 0.75), 5_000);

  if (categoryRestricted) {
    reasons.push({
      code: AuthorityReason.CATEGORY_RESTRICTED,
      severity: getReasonSeverity(AuthorityReason.CATEGORY_RESTRICTED, ctx.surface),
      detail: 'Category is restricted in preferences; simulator would flag this spend.',
    });
  }

  if (ctx.dailyStateStatus === DailyStateStatus.RISKY) {
    reasons.push({
      code: AuthorityReason.DAILY_STATE_RISKY,
      severity: getReasonSeverity(AuthorityReason.DAILY_STATE_RISKY, ctx.surface),
      detail: 'DailyState is risky; simulator recommends caution.',
    });
  } else if (ctx.dailyStateStatus === DailyStateStatus.TIGHT) {
    reasons.push({
      code: AuthorityReason.DAILY_STATE_RISKY,
      severity: getReasonSeverity(AuthorityReason.DAILY_STATE_RISKY, ctx.surface),
      detail: 'DailyState is tight; simulator suggests extra care.',
    });
  }

  if (bucketExhausted) {
    reasons.push({
      code: AuthorityReason.BUCKET_EXHAUSTED,
      severity: getReasonSeverity(AuthorityReason.BUCKET_EXHAUSTED, ctx.surface),
      detail: 'Category bucket is exhausted; simulator would flag this spend.',
    });
  }

  if (verificationPending) {
    reasons.push({
      code: AuthorityReason.VERIFICATION_PENDING,
      severity: getReasonSeverity(AuthorityReason.VERIFICATION_PENDING, ctx.surface),
      detail: 'Verification is pending; simulator warns before new spend.',
    });
  }

  if (essentialBufferLow) {
    const remaining = ctx.bucket?.remainingCents ?? ctx.safeToSpendCents ?? 0;
    reasons.push({
      code: AuthorityReason.ESSENTIAL_BUFFER_LOW,
      severity: getReasonSeverity(AuthorityReason.ESSENTIAL_BUFFER_LOW, ctx.surface),
      detail: `Essential buffer is low (~${Math.max(0, Math.floor(remaining))} cents remaining).`,
    });
  }

  if (amountSpike) {
    reasons.push({
      code: AuthorityReason.AMOUNT_SPIKE,
      severity: getReasonSeverity(AuthorityReason.AMOUNT_SPIKE, ctx.surface),
      detail: 'Amount looks like a spike relative to available buffer.',
    });
  }

  if (reasons.length === 0) {
    reasons.push({
      code: AuthorityReason.DAILY_STATE_RISKY,
      severity: 0,
      detail: 'No guardrails triggered; simulator allows this spend.',
    });
  }

  return reasons.sort((a, b) => b.severity - a.severity);
}

function computeVerdict(severity: number): SimulatedAuthorityVerdict {
  if (severity >= 3) return 'FLAG_SIMULATED';
  if (severity >= 1) return 'WARN_SIMULATED';
  return 'ALLOW_SIMULATED';
}

function buildExplanation(reasons: SimulatedAuthorityReason[]): string {
  const top = reasons.at(0);
  return top ? top.detail : 'Simulator could not derive an explanation.';
}

export async function simulateSpendAuthority(
  params: SimulateSpendParams,
  options: { prisma?: AuthorityPrismaClient; now?: Date } = {}
): Promise<SimulatedAuthorityDecision> {
  const client = options.prisma ?? prisma;
  const now = options.now ?? new Date();
  const amountCents = Math.max(0, Math.floor(params.amountCents));

  const [dailyState, buckets, categoryPreference, pendingSessions, pendingLedger] =
    await Promise.all([
      client.dailyState.findFirst({
        where: { userId: params.userId },
        orderBy: { computedAt: 'desc' },
      }),
      client.bucket.findMany({
        where: { userId: params.userId },
        orderBy: { createdAt: 'asc' },
      }),
      client.categoryPreference.findUnique({
        where: {
          userId_category: { userId: params.userId, category: params.category },
        },
      }),
      client.recommendationSession.count({
        where: { userId: params.userId, verificationStatus: VerificationStatus.PENDING },
      }),
      client.cherryPointLedger.aggregate({
        where: { userId: params.userId, status: CherryPointLedgerStatus.PENDING },
        _sum: { points: true },
      }),
    ]);

  const pendingPoints = pendingLedger._sum.points ?? 0;
  const runtimeBuckets = buckets
    .map((bucket) => applyInMemoryRollover(bucket as Bucket, now))
    .map((bucket) => toBucketRuntime(bucket));
  const categoryBucket =
    runtimeBuckets.find((bucket) => bucket.category === params.category) ?? null;

  const inputsVersion = computeInputsVersion({
    userId: params.userId,
    amountCents,
    category: params.category,
    surface: params.surface,
    dailyState: dailyState
      ? {
          status: dailyState.status,
          safeToSpendCents: dailyState.safeToSpendCents ?? null,
          inputsVersion: dailyState.inputsVersion ?? null,
        }
      : null,
    categoryPreferenceMode: categoryPreference?.mode ?? null,
    pendingSessions,
    pendingPoints,
    counterfactuals: params.counterfactuals ?? [],
    buckets: runtimeBuckets.map((bucket) => ({
      id: bucket.id,
      category: bucket.category,
      budgetAmount: bucket.budgetAmount,
      remainingCents: bucket.remainingCents,
      strictMode: bucket.strictMode,
      periodEnd: bucket.periodEnd?.toISOString() ?? null,
    })),
  });

  const ctx: EvaluationContext = {
    amountCents,
    category: params.category,
    bucket: categoryBucket,
    dailyStateStatus: dailyState?.status ?? DailyStateStatus.INSUFFICIENT_DATA,
    safeToSpendCents: dailyState?.safeToSpendCents ?? null,
    categoryPreferenceMode: categoryPreference?.mode ?? null,
    pendingSessions,
    pendingPoints,
    delayDays: 0,
    surface: params.surface,
  };

  const reasons = evaluateReasons(ctx);
  const severity = reasons.reduce((acc, r) => Math.max(acc, r.severity), 0);
  const verdict = computeVerdict(severity);
  const explanation = buildExplanation(reasons);

  const requestedCounterfactuals =
    params.counterfactuals && params.counterfactuals.length > 0
      ? params.counterfactuals
      : [
          { amountCents: Math.max(0, Math.floor(amountCents * 0.8)) },
          { delayDays: 3 },
        ];

  const counterfactuals: CounterfactualAuthorityResult[] = requestedCounterfactuals.map(
    (adjustment) => {
      const adjustedBucket =
        adjustment.bucketId != null
          ? runtimeBuckets.find((bucket) => bucket.id === adjustment.bucketId) ?? categoryBucket
          : categoryBucket;
      const adjustedCtx: EvaluationContext = {
        ...ctx,
        amountCents: adjustment.amountCents ?? amountCents,
        bucket: adjustedBucket,
        delayDays: adjustment.delayDays ?? 0,
        surface: params.surface,
      };
      const cfReasons = evaluateReasons(adjustedCtx);
      const cfSeverity = cfReasons.reduce((acc, r) => Math.max(acc, r.severity), 0);
      const cfVerdict = computeVerdict(cfSeverity);
      return {
        adjustment,
        verdict: cfVerdict,
        severity: cfSeverity,
        reasons: cfReasons,
        explanation: buildExplanation(cfReasons),
      };
    }
  );

  return {
    version: 'authority_v1',
    verdict,
    severity,
    reasons,
    explanation,
    inputsVersion,
    engineVersion: ENGINE_VERSION,
    counterfactuals,
  };
}

export async function recordDecisionEvent(options: {
  userId: string;
  surface: SimulateSpendParams['surface'];
  params: SimulateSpendParams;
  decision: SimulatedAuthorityDecision;
  db?: DecisionEventClient;
}): Promise<void> {
  const client = options.db ?? prisma;
  await client.decisionEvent.create({
    data: {
      userId: options.userId,
      surface: options.surface,
      amountCents: Math.floor(options.params.amountCents),
      category: options.params.category,
      verdict: options.decision.verdict,
      reasonCode: options.decision.reasons[0]?.code ?? options.decision.verdict,
      reasonCodes: options.decision.reasons.map((r) => r.code),
      severity: options.decision.severity,
      inputsVersion: options.decision.inputsVersion,
      counterfactuals: options.decision.counterfactuals,
    },
  });
}
