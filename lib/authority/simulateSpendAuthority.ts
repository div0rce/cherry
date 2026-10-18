// authority_v1 — frozen. Any semantic change requires authority_v2.
import type { CategoryBudgetMode, DailyStateStatus, RewardCategory } from '../enums.js';
import type { Digest } from '../adapters/digest.js';
import type { Logger } from '../adapters/logger.js';
import { assertPolicyTotal } from '../policy/assert-total.js';
import type { AuthorityVerdict } from '../policy/verdicts.js';
import { AuthorityReason } from './reasonCodes.js';
import {
  authorityPureBrand,
  authorityVersion,
  getReasonSeverity,
  type AuthorityPure,
  type AuthoritySurface,
  type AuthorityVersion,
} from './config.js';

export type SimulatedAuthorityVerdict = AuthorityVerdict;

export type SimulatedAuthorityReason = {
  code: AuthorityReason;
  severity: number;
  detail: string;
};

export type SimulatedAuthorityDecision = {
  version: AuthorityVersion;
  verdict: SimulatedAuthorityVerdict;
  severity: number;
  reasons: SimulatedAuthorityReason[];
  explanation: string;
  inputsVersion: string;
  engineVersion: string | null;
  counterfactuals: CounterfactualAuthorityResult[];
};

export type AuthorityDecision = AuthorityPure & SimulatedAuthorityDecision;

export type SafeAuthorityDecision =
  | { ok: true; decision: AuthorityDecision }
  | { ok: false; status: 'fallback' | 'blocked'; reason: string; decision: AuthorityDecision };

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

export type AuthorityBucket = {
  id: string;
  category: RewardCategory;
  budgetAmount: number;
  remainingCents: number;
  strictMode: boolean;
  periodEndMs: number | null;
};

export type AuthoritySnapshot = {
  dailyState:
    | {
        status: DailyStateStatus;
        safeToSpendCents: number | null;
        inputsVersion: string | null;
      }
    | null;
  buckets: AuthorityBucket[];
  categoryPreferenceMode: CategoryBudgetMode | null;
  pendingSessions: number;
  pendingPoints: number;
};

export type DecisionEventCreateArgs = {
  data: {
    userId: string;
    surface: SimulateSpendParams['surface'];
    amountCents: number;
    category: RewardCategory;
    verdict: SimulatedAuthorityVerdict;
    reasonCode: string;
    reasonCodes: string[];
    severity: number;
    inputsVersion: string;
    counterfactuals: CounterfactualAuthorityResult[];
  };
};

export type DecisionEventWriter = {
  create: (args: DecisionEventCreateArgs) => Promise<unknown>;
};

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
  categoryPreferenceMode: CategoryBudgetMode | null;
  pendingSessions: number;
  pendingPoints: number;
  counterfactuals: CounterfactualAuthorityRequest[];
  buckets: Array<{
    id: string;
    category: RewardCategory;
    budgetAmount: number;
    remainingCents: number;
    strictMode: boolean;
    periodEndMs: number | null;
  }>;
};

type EvaluationContext = {
  amountCents: number;
  category: RewardCategory;
  bucket: AuthorityBucket | null;
  dailyStateStatus: DailyStateStatus;
  safeToSpendCents: number | null;
  categoryPreferenceMode: CategoryBudgetMode | null;
  pendingSessions: number;
  pendingPoints: number;
  delayDays: number;
  surface: AuthoritySurface;
};

function computeInputsVersion(
  inputs: AuthorityInputs,
  engineVersion: string,
  digest: Digest
): string {
  const payload = JSON.stringify({
    engineVersion,
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
  });

  return digest.sha256(payload);
}

type ReasonRule = {
  code: AuthorityReason;
  detail: (ctx: EvaluationContext) => string | null;
};

function isVerificationPending(ctx: EvaluationContext): boolean {
  if (ctx.pendingSessions > 0) return true;
  return ctx.pendingPoints > 0;
}

function isBucketBufferLow(bucket: AuthorityBucket | null): boolean {
  if (bucket === null) return false;
  return bucket.remainingCents > 0 && bucket.remainingCents <= 2000;
}

function isEssentialBufferLow(ctx: EvaluationContext): boolean {
  if (ctx.dailyStateStatus === 'TIGHT') return true;
  return isBucketBufferLow(ctx.bucket);
}

function isAmountSpike(ctx: EvaluationContext): boolean {
  const remainingBaseline = ctx.bucket?.remainingCents ?? ctx.safeToSpendCents ?? null;
  if (remainingBaseline === null) return false;
  if (!(remainingBaseline > 0)) return false;
  return ctx.amountCents >= Math.max(Math.floor(remainingBaseline * 0.75), 5_000);
}

const DAILY_STATE_DETAILS: Partial<Record<DailyStateStatus, string>> = {
  RISKY: 'DailyState is risky; simulator recommends caution.',
  TIGHT: 'DailyState is tight; simulator suggests extra care.',
};

function essentialBufferDetail(ctx: EvaluationContext): string | null {
  if (!isEssentialBufferLow(ctx)) return null;
  const remaining = ctx.bucket?.remainingCents ?? ctx.safeToSpendCents ?? 0;
  return `Essential buffer is low (~${Math.max(0, Math.floor(remaining))} cents remaining).`;
}

function detailWhen(condition: boolean, detail: string): string | null {
  return condition ? detail : null;
}

const REASON_RULES: readonly ReasonRule[] = [
  {
    code: AuthorityReason.CATEGORY_RESTRICTED,
    detail: (ctx) =>
      detailWhen(
        ctx.categoryPreferenceMode === 'UNBUDGETED',
        'Category is restricted in preferences; simulator would flag this spend.'
      ),
  },
  {
    code: AuthorityReason.DAILY_STATE_RISKY,
    detail: (ctx) => {
      const detail = DAILY_STATE_DETAILS[ctx.dailyStateStatus];
      return detail === undefined ? null : detail;
    },
  },
  {
    code: AuthorityReason.BUCKET_EXHAUSTED,
    detail: (ctx) =>
      detailWhen(
        ctx.bucket !== null && ctx.bucket.remainingCents <= 0,
        'Category bucket is exhausted; simulator would flag this spend.'
      ),
  },
  {
    code: AuthorityReason.VERIFICATION_PENDING,
    detail: (ctx) =>
      detailWhen(isVerificationPending(ctx), 'Verification is pending; simulator warns before new spend.'),
  },
  {
    code: AuthorityReason.ESSENTIAL_BUFFER_LOW,
    detail: essentialBufferDetail,
  },
  {
    code: AuthorityReason.AMOUNT_SPIKE,
    detail: (ctx) =>
      detailWhen(isAmountSpike(ctx), 'Amount looks like a spike relative to available buffer.'),
  },
];

function evaluateReasons(ctx: EvaluationContext): SimulatedAuthorityReason[] {
  const reasons: SimulatedAuthorityReason[] = [];

  for (const rule of REASON_RULES) {
    const detail = rule.detail(ctx);
    if (detail === null) continue;
    reasons.push({
      code: rule.code,
      severity: getReasonSeverity(rule.code, ctx.surface),
      detail,
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

type SnapshotOptions = {
  nowMs: number;
  engineVersion: string | null;
  snapshot: AuthoritySnapshot;
  digest: Digest;
};

function assertSnapshotOptions(options: SnapshotOptions): string {
  if (options.nowMs == null || Number.isNaN(options.nowMs)) {
    throw new Error('simulateSpendAuthorityFromSnapshot requires explicit `nowMs`');
  }
  if (options.engineVersion == null || options.engineVersion === '') {
    throw new Error('simulateSpendAuthorityFromSnapshot requires explicit `engineVersion`');
  }
  return options.engineVersion;
}

function buildAuthorityInputs(
  params: SimulateSpendParams,
  snapshot: AuthoritySnapshot,
  amountCents: number
): AuthorityInputs {
  return {
    userId: params.userId,
    amountCents,
    category: params.category,
    surface: params.surface,
    dailyState: snapshot.dailyState
      ? {
          status: snapshot.dailyState.status,
          safeToSpendCents: snapshot.dailyState.safeToSpendCents ?? null,
          inputsVersion: snapshot.dailyState.inputsVersion ?? null,
        }
      : null,
    categoryPreferenceMode: snapshot.categoryPreferenceMode ?? null,
    pendingSessions: snapshot.pendingSessions,
    pendingPoints: snapshot.pendingPoints,
    counterfactuals: params.counterfactuals ?? [],
    buckets: snapshot.buckets.map((bucket) => ({
      id: bucket.id,
      category: bucket.category,
      budgetAmount: bucket.budgetAmount,
      remainingCents: bucket.remainingCents,
      strictMode: bucket.strictMode,
      periodEndMs: bucket.periodEndMs,
    })),
  };
}

function buildEvaluationContext(
  params: SimulateSpendParams,
  snapshot: AuthoritySnapshot,
  amountCents: number,
  categoryBucket: AuthorityBucket | null
): EvaluationContext {
  return {
    amountCents,
    category: params.category,
    bucket: categoryBucket,
    dailyStateStatus: snapshot.dailyState?.status ?? 'INSUFFICIENT_DATA',
    safeToSpendCents: snapshot.dailyState?.safeToSpendCents ?? null,
    categoryPreferenceMode: snapshot.categoryPreferenceMode ?? null,
    pendingSessions: snapshot.pendingSessions,
    pendingPoints: snapshot.pendingPoints,
    delayDays: 0,
    surface: params.surface,
  };
}

type EvaluatedOutcome = {
  reasons: SimulatedAuthorityReason[];
  severity: number;
  verdict: SimulatedAuthorityVerdict;
  explanation: string;
};

function evaluateOutcome(ctx: EvaluationContext): EvaluatedOutcome {
  const reasons = evaluateReasons(ctx);
  const severity = reasons.reduce((acc, r) => Math.max(acc, r.severity), 0);
  return {
    reasons,
    severity,
    verdict: computeVerdict(severity),
    explanation: buildExplanation(reasons),
  };
}

function requestedCounterfactualsFor(
  params: SimulateSpendParams,
  amountCents: number
): CounterfactualAuthorityRequest[] {
  if (params.counterfactuals && params.counterfactuals.length > 0) {
    return params.counterfactuals;
  }
  return [{ amountCents: Math.max(0, Math.floor(amountCents * 0.8)) }, { delayDays: 3 }];
}

function adjustedBucketFor(
  adjustment: CounterfactualAuthorityRequest,
  runtimeBuckets: AuthorityBucket[],
  categoryBucket: AuthorityBucket | null
): AuthorityBucket | null {
  if (adjustment.bucketId == null) return categoryBucket;
  return runtimeBuckets.find((bucket) => bucket.id === adjustment.bucketId) ?? categoryBucket;
}

function evaluateCounterfactual(
  adjustment: CounterfactualAuthorityRequest,
  ctx: EvaluationContext,
  buckets: { runtimeBuckets: AuthorityBucket[]; categoryBucket: AuthorityBucket | null }
): CounterfactualAuthorityResult {
  const adjustedCtx: EvaluationContext = {
    ...ctx,
    amountCents: adjustment.amountCents ?? ctx.amountCents,
    bucket: adjustedBucketFor(adjustment, buckets.runtimeBuckets, buckets.categoryBucket),
    delayDays: adjustment.delayDays ?? 0,
    surface: ctx.surface,
  };
  const outcome = evaluateOutcome(adjustedCtx);
  return {
    adjustment,
    verdict: outcome.verdict,
    severity: outcome.severity,
    reasons: outcome.reasons,
    explanation: outcome.explanation,
  };
}

export async function simulateSpendAuthorityFromSnapshot(
  params: SimulateSpendParams,
  options: SnapshotOptions
): Promise<AuthorityDecision> {
  const engineVersion = assertSnapshotOptions(options);

  const amountCents = Math.max(0, Math.floor(params.amountCents));

  const snapshot = options.snapshot;
  const runtimeBuckets = snapshot.buckets;
  const categoryBucket =
    runtimeBuckets.find((bucket) => bucket.category === params.category) ?? null;

  const inputsVersion = computeInputsVersion(
    buildAuthorityInputs(params, snapshot, amountCents),
    engineVersion,
    options.digest
  );

  const ctx = buildEvaluationContext(params, snapshot, amountCents, categoryBucket);
  const outcome = evaluateOutcome(ctx);

  const counterfactuals: CounterfactualAuthorityResult[] = requestedCounterfactualsFor(
    params,
    amountCents
  ).map((adjustment) => evaluateCounterfactual(adjustment, ctx, { runtimeBuckets, categoryBucket }));

  const decision: SimulatedAuthorityDecision = {
    version: authorityVersion,
    verdict: outcome.verdict,
    severity: outcome.severity,
    reasons: outcome.reasons,
    explanation: outcome.explanation,
    inputsVersion,
    engineVersion,
    counterfactuals,
  };

  assertPolicyTotal({ kind: decision.verdict });
  for (const cf of decision.counterfactuals) {
    assertPolicyTotal({ kind: cf.verdict });
  }

  return {
    ...decision,
    __authorityPure: authorityPureBrand,
  };
}

export async function recordDecisionEventWithWriter(options: {
  userId: string;
  surface: SimulateSpendParams['surface'];
  params: SimulateSpendParams;
  decision: SimulatedAuthorityDecision;
  writer?: DecisionEventWriter;
  logger?: Logger;
}): Promise<void> {
  const writer = options.writer;
  if (!writer || typeof writer.create !== 'function') {
    options.logger?.warn('DecisionEvent writer missing create; skipping record', {
      userId: options.userId,
      surface: options.surface,
    });
    return;
  }

  await writer.create({
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
