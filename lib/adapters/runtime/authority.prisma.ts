import { prisma } from '../../prisma.js';
import { getServerConfig } from '../../config/store.js';
import type { Logger } from '../logger.js';
import { ConsoleLogger } from './logger.console.js';
import { Sha256Digest } from './digest.sha256.js';
import {
  simulateSpendAuthorityFromSnapshot,
  recordDecisionEventWithWriter,
  type AuthoritySnapshot,
  type SimulateSpendParams,
  type SimulatedAuthorityDecision,
} from '../../authority/simulateSpendAuthority.js';
import { CherryPointLedgerStatus, VerificationStatus } from '@prisma/client';
import { applyInMemoryRollover } from '../../buckets/periods.js';
import { toBucketRuntime } from '../../buckets-runtime.js';

async function buildAuthoritySnapshot(
  params: SimulateSpendParams,
  nowMs: number
): Promise<AuthoritySnapshot> {
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
): ReturnType<typeof simulateSpendAuthorityFromSnapshot> {
  const snapshot = await buildAuthoritySnapshot(params, options.nowMs);
  const serverConfig = getServerConfig();
  return simulateSpendAuthorityFromSnapshot(params, {
    nowMs: options.nowMs,
    engineVersion: options.engineVersion ?? serverConfig.engineVersion,
    snapshot,
    digest: Sha256Digest,
  });
}

export async function recordDecisionEvent(options: {
  userId: string;
  surface: SimulateSpendParams['surface'];
  params: SimulateSpendParams;
  decision: SimulatedAuthorityDecision;
  logger?: Logger;
}): Promise<void> {
  await recordDecisionEventWithWriter({
    userId: options.userId,
    surface: options.surface,
    params: options.params,
    decision: options.decision,
    writer: prisma.decisionEvent,
    logger: options.logger ?? ConsoleLogger,
  });
}
