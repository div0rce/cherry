// authority_v1 — frozen. Any semantic change requires authority_v2.
import type { CategoryBudgetMode, DailyStateStatus, RewardCategory } from '../enums';
import type { Digest } from '../adapters/digest';
import type { Logger } from '../adapters/logger';
import { assertPolicyTotal } from '../policy/assert-total.js';
import type { AuthorityVerdict } from '../policy/verdicts';
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

function evaluateReasons(ctx: EvaluationContext): SimulatedAuthorityReason[] {
  const reasons: SimulatedAuthorityReason[] = [];
  const remainingBaseline = ctx.bucket?.remainingCents ?? ctx.safeToSpendCents ?? null;
  const categoryRestricted = ctx.categoryPreferenceMode === 'UNBUDGETED';
  const bucketExhausted = ctx.bucket !== null && ctx.bucket.remainingCents <= 0;
  const verificationPending = ctx.pendingSessions > 0 || ctx.pendingPoints > 0;
  const essentialBufferLow =
    ctx.dailyStateStatus === 'TIGHT' ||
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

  if (ctx.dailyStateStatus === 'RISKY') {
    reasons.push({
      code: AuthorityReason.DAILY_STATE_RISKY,
      severity: getReasonSeverity(AuthorityReason.DAILY_STATE_RISKY, ctx.surface),
      detail: 'DailyState is risky; simulator recommends caution.',
    });
  } else if (ctx.dailyStateStatus === 'TIGHT') {
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

export async function simulateSpendAuthorityFromSnapshot(
  params: SimulateSpendParams,
  options: {
    nowMs: number;
    engineVersion: string | null;
    snapshot: AuthoritySnapshot;
    digest: Digest;
  }
): Promise<AuthorityDecision> {
  if (options.nowMs == null || Number.isNaN(options.nowMs)) {
    throw new Error('simulateSpendAuthorityFromSnapshot requires explicit `nowMs`');
  }
  if (options.engineVersion == null || options.engineVersion === '') {
    throw new Error('simulateSpendAuthorityFromSnapshot requires explicit `engineVersion`');
  }

  const amountCents = Math.max(0, Math.floor(params.amountCents));

  const snapshot = options.snapshot;
  const pendingPoints = snapshot.pendingPoints;
  const runtimeBuckets = snapshot.buckets;
  const categoryBucket =
    runtimeBuckets.find((bucket) => bucket.category === params.category) ?? null;

  const inputsVersion = computeInputsVersion(
    {
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
      pendingPoints,
      counterfactuals: params.counterfactuals ?? [],
      buckets: runtimeBuckets.map((bucket) => ({
        id: bucket.id,
        category: bucket.category,
        budgetAmount: bucket.budgetAmount,
        remainingCents: bucket.remainingCents,
        strictMode: bucket.strictMode,
        periodEndMs: bucket.periodEndMs,
      })),
    },
    options.engineVersion,
    options.digest
  );

  const ctx: EvaluationContext = {
    amountCents,
    category: params.category,
    bucket: categoryBucket,
    dailyStateStatus: snapshot.dailyState?.status ?? 'INSUFFICIENT_DATA',
    safeToSpendCents: snapshot.dailyState?.safeToSpendCents ?? null,
    categoryPreferenceMode: snapshot.categoryPreferenceMode ?? null,
    pendingSessions: snapshot.pendingSessions,
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

  const decision: SimulatedAuthorityDecision = {
    version: authorityVersion,
    verdict,
    severity,
    reasons,
    explanation,
    inputsVersion,
    engineVersion: options.engineVersion,
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
