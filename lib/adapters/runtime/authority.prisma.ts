import { prisma } from '../../prisma.js';
import { getServerConfig } from '../../config/store.js';
import type { Logger } from '../logger.js';
import { ConsoleLogger } from './logger.console.js';
import { Sha256Digest } from './digest.sha256.js';
import { assertPrismaReady } from '../assert-prisma-ready.js';
import {
  simulateSpendAuthorityFromSnapshot,
  recordDecisionEventWithWriter,
  type AuthorityDecision,
  type AuthoritySnapshot,
  type SafeAuthorityDecision,
  type SimulateSpendParams,
  type SimulatedAuthorityDecision,
} from '../../authority/simulateSpendAuthority.js';
import { AuthorityReason } from '../../authority/reasonCodes.js';
import { authorityPureBrand, authorityVersion, getReasonSeverity } from '../../authority/config.js';
import { CherryPointLedgerStatus, VerificationStatus } from '@prisma/client';
import { applyInMemoryRollover } from '../../buckets/periods.js';
import { toBucketRuntime } from '../../buckets-runtime.js';
import { asAppError } from '../../errors.js';

async function buildAuthoritySnapshot(
  params: SimulateSpendParams,
  nowMs: number
): Promise<AuthoritySnapshot> {
  assertPrismaReady(prisma);
  const [dailyState, buckets, categoryPreference, pendingSessions, pendingLedger] =
    await Promise.all([
      prisma.dailyState.findFirst({
        where: { userId: params.userId },
        orderBy: { computedAt: 'desc' },
      }),
      prisma.bucket.findMany({
        where: { userId: params.userId },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.categoryPreference.findUnique({
        where: {
          userId_category: { userId: params.userId, category: params.category },
        },
      }),
      prisma.recommendationSession.count({
        where: { userId: params.userId, verificationStatus: VerificationStatus.PENDING },
      }),
      prisma.cherryPointLedger.aggregate({
        where: { userId: params.userId, status: CherryPointLedgerStatus.PENDING },
        _sum: { points: true },
      }),
    ]);

  const now = new Date(nowMs);
  const runtimeBuckets = buckets.map((bucket) => toBucketRuntime(applyInMemoryRollover(bucket, now)));

  return {
    dailyState: dailyState
      ? {
          status: dailyState.status,
          safeToSpendCents: dailyState.safeToSpendCents ?? null,
          inputsVersion: dailyState.inputsVersion ?? null,
        }
      : null,
    buckets: runtimeBuckets.map((bucket) => ({
      id: bucket.id,
      category: bucket.category,
      budgetAmount: bucket.budgetAmount,
      remainingCents: bucket.remainingCents,
      strictMode: bucket.strictMode ?? false,
      periodEndMs: bucket.periodEnd !== null ? bucket.periodEnd.getTime() : null,
    })),
    categoryPreferenceMode: categoryPreference?.mode ?? null,
    pendingSessions,
    pendingPoints: pendingLedger._sum.points ?? 0,
  };
}

export async function simulateSpendAuthority(
  params: SimulateSpendParams,
  options: { nowMs: number; engineVersion?: string }
): Promise<SafeAuthorityDecision> {
  const serverConfig = getServerConfig();
  const engineVersion = options.engineVersion ?? serverConfig.engineVersion ?? 'unknown';
  const fallbackDecision = async () =>
    buildFallbackDecision(params, options.nowMs, engineVersion);
  const isValidAmount = Number.isFinite(params.amountCents) && params.amountCents > 0;

  if (!isValidAmount) {
    return {
      ok: false,
      status: 'blocked',
      reason: 'INVALID_AMOUNT',
      decision: await fallbackDecision(),
    };
  }

  try {
    const snapshot = await buildAuthoritySnapshot(params, options.nowMs);
    const decision = await simulateSpendAuthorityFromSnapshot(params, {
      nowMs: options.nowMs,
      engineVersion,
      snapshot,
      digest: Sha256Digest,
    });
    return { ok: true, decision };
  } catch (err: unknown) {
    const appError = asAppError(err);
    return {
      ok: false,
      status: 'fallback',
      reason: appError.code,
      decision: await fallbackDecision(),
    };
  }
}

export async function recordDecisionEvent(options: {
  userId: string;
  surface: SimulateSpendParams['surface'];
  params: SimulateSpendParams;
  decision: SimulatedAuthorityDecision;
  logger?: Logger;
}): Promise<void> {
  assertPrismaReady(prisma);
  await recordDecisionEventWithWriter({
    userId: options.userId,
    surface: options.surface,
    params: options.params,
    decision: options.decision,
    writer: prisma.decisionEvent,
    logger: options.logger ?? ConsoleLogger,
  });
}

async function buildFallbackDecision(
  params: SimulateSpendParams,
  nowMs: number,
  engineVersion: string
): Promise<AuthorityDecision> {
  const snapshot: AuthoritySnapshot = {
    dailyState: null,
    buckets: [],
    categoryPreferenceMode: null,
    pendingSessions: 0,
    pendingPoints: 0,
  };
  try {
    return await simulateSpendAuthorityFromSnapshot(params, {
      nowMs,
      engineVersion,
      snapshot,
      digest: Sha256Digest,
    });
  } catch (error: unknown) {
    void error;
    const severity = getReasonSeverity(AuthorityReason.DAILY_STATE_RISKY, params.surface);
    return {
      __authorityPure: authorityPureBrand,
      version: authorityVersion,
      verdict: 'FLAG_SIMULATED',
      severity,
      reasons: [
        {
          code: AuthorityReason.DAILY_STATE_RISKY,
          severity,
          detail: 'Authority fallback: unable to compute snapshot.',
        },
      ],
      explanation: 'Authority fallback: unavailable snapshot.',
      inputsVersion: `fallback:${params.userId}:${params.amountCents}:${params.category}`,
      engineVersion,
      counterfactuals: [],
    };
  }
}
