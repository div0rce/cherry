import * as assert from 'node:assert/strict';
import * as Module from 'node:module';
import { fileURLToPath } from 'node:url';
import { BucketPeriod, RecommendationSource, RewardCategory } from '@prisma/client';
import type { AutopilotStateSnapshot } from '../lib/autopilot/engineDecisionId';
import {
  buildAutopilotStateSnapshotHash,
  computeEngineDecisionIdV1,
} from '../lib/autopilot/engineDecisionId';
import type {
  AutopilotCommitInput,
  AutopilotPreviewInput,
  AutopilotPreviewOutput,
} from '../lib/autopilot/types';
import type { World } from '../lib/adapters/world';
import { makeTestWorld } from './helpers/world';

const __filename = fileURLToPath(import.meta.url);
const requireModule = Module.createRequire(__filename);

function mockModule(modulePath: string, exports: unknown) {
  requireModule.cache[modulePath] = {
    id: modulePath,
    filename: modulePath,
    loaded: true,
    exports,
    path: modulePath,
    parent: null,
    children: [],
    paths: [],
    require: requireModule,
    isPreloading: false,
  } as NodeModule;
}

function resetModules() {
  const targets = [
    '@/lib/autopilot/service',
    '@/lib/autopilot/engineDecisionId',
    '@/lib/engine/public',
    '@/lib/prisma',
    '@/lib/scan-helpers',
    '@/lib/log',
    '@/lib/metrics/autopilot',
    '@/lib/sessions/confirm-service',
    '@/lib/buckets/ensure-fresh',
  ];
  for (const target of targets) {
    try {
      const resolved = requireModule.resolve(target);
      delete requireModule.cache[resolved];
    } catch (error: unknown) {
      void error;
      // ignore missing
    }
  }
}

function buildBaseSnapshot(): AutopilotStateSnapshot {
  return {
    cards: [
      {
        issuer: 'Issuer A',
        network: 'VISA',
        isCredit: true,
        nickname: 'Alpha',
        rewardRules: [
          {
            category: RewardCategory.DINING,
            multiplier: '3.000000',
            cashbackPercent: null,
            capAmount: null,
          },
          {
            category: RewardCategory.OTHER,
            multiplier: '1.000000',
            cashbackPercent: null,
            capAmount: null,
          },
        ],
      },
      {
        issuer: null,
        network: 'MASTERCARD',
        isCredit: true,
        nickname: 'Beta',
        rewardRules: [
          {
            category: RewardCategory.DINING,
            multiplier: '2.000000',
            cashbackPercent: null,
            capAmount: null,
          },
        ],
      },
    ],
    buckets: [
      {
        category: RewardCategory.DINING,
        strictMode: true,
        period: BucketPeriod.MONTHLY,
        budgetAmount: 100_000,
        currentAmount: 80_000,
        spentCents: 20_000,
        periodStart: '2024-01-01T00:00:00.000Z',
        periodEnd: '2024-02-01T00:00:00.000Z',
      },
    ],
    objectives: {
      profileId: 'BALANCED',
      customWeights: { rewards: 1, runway: 1, debtRelief: 1, volatility: 1, ruleViolations: 1 },
    },
  };
}

function cloneSnapshot(snapshot: AutopilotStateSnapshot): AutopilotStateSnapshot {
  return structuredClone(snapshot);
}

function computeId(overrides: {
  snapshot?: AutopilotStateSnapshot;
  merchant?: string;
  effectiveAt?: Date;
  amountCents?: number;
  category?: RewardCategory;
  currency?: string;
} = {}): string {
  const snapshot = overrides.snapshot ?? buildBaseSnapshot();
  const stateSnapshotHash = buildAutopilotStateSnapshotHash(snapshot);
  return computeEngineDecisionIdV1({
    userId: 'user-1',
    source: RecommendationSource.AUTOPILOT,
    amountCents: overrides.amountCents ?? 25_00,
    currency: overrides.currency ?? 'USD',
    merchantName: overrides.merchant ?? 'Test Shop',
    category: overrides.category ?? RewardCategory.DINING,
    effectiveAt: overrides.effectiveAt ?? new Date('2024-01-01T12:00:30.000Z'),
    stateSnapshotHash,
  });
}

async function runDeterminismSuite() {
  const id1 = computeId();
  const id2 = computeId();
  assert.equal(id1, id2, 'IDs should match for identical inputs');

  const normalizedMerchantId = computeId({ merchant: '  test   shop ' });
  assert.equal(id1, normalizedMerchantId, 'Merchant normalization should preserve idempotency');

  const changedBucket = cloneSnapshot(buildBaseSnapshot());
  const changedBucketTarget = changedBucket.buckets[0];
  if (!changedBucketTarget) throw new Error('Missing bucket in test fixture');
  changedBucketTarget.spentCents = 25_000;
  changedBucketTarget.currentAmount = 75_000;
  const bucketShiftedId = computeId({ snapshot: changedBucket });
  assert.notEqual(bucketShiftedId, id1, 'Bucket balance changes should alter the id');

  const rewardTweaked = cloneSnapshot(buildBaseSnapshot());
  const rewardRuleTarget = rewardTweaked.cards[0]?.rewardRules[0];
  if (!rewardRuleTarget) throw new Error('Missing reward rule in test fixture');
  rewardRuleTarget.multiplier = '4.000000';
  const rewardShiftedId = computeId({ snapshot: rewardTweaked });
  assert.notEqual(rewardShiftedId, id1, 'Reward rule changes should alter the id');

  const effectiveAtOne = computeId({ effectiveAt: new Date('2024-01-01T12:00:00.000Z') });
  const effectiveAtTwo = computeId({ effectiveAt: new Date('2024-01-01T12:01:01.000Z') });
  assert.notEqual(effectiveAtOne, effectiveAtTwo, 'Minute bucket change should alter the id');

  const currencyNormalized = computeId({ currency: 'usd' });
  assert.equal(currencyNormalized, id1, 'Currency casing should normalize');
}

async function runSemanticStabilityAcrossRowIds() {
  resetModules();
  let bucketCall = 0;

  mockModule(requireModule.resolve('@/lib/prisma'), {
    prisma: {
      rewardRule: {
        findMany: async (args: { where: { cardId: { in: string[] } } }) =>
          args.where.cardId.in.flatMap((cardId) => [
            {
              cardId,
              category: RewardCategory.DINING,
              multiplier: 3,
              cashbackPercent: null,
              capAmount: null,
            },
            {
              cardId,
              category: RewardCategory.OTHER,
              multiplier: 1,
              cashbackPercent: null,
              capAmount: null,
            },
          ]),
      },
      bucket: {
        findMany: async () => {
          bucketCall += 1;
          return [
            {
              id: `bucket-${bucketCall}`,
              userId: 'user-1',
              name: 'Dining',
              period: BucketPeriod.MONTHLY,
              budgetAmount: 100_000,
              currentAmount: 80_000,
              spentCents: 20_000,
              strictMode: true,
              category: RewardCategory.DINING,
              periodStart: new Date('2024-01-01T00:00:00.000Z'),
              periodEnd: new Date('2024-02-01T00:00:00.000Z'),
              lastResetAt: null,
              createdAt: new Date('2023-12-01T00:00:00.000Z'),
              updatedAt: new Date('2023-12-01T00:00:00.000Z'),
            },
          ];
        },
      },
      user: {
        findUnique: async () => ({
          engineObjectiveProfile: 'BALANCED',
          engineObjectiveWeights: null,
        }),
      },
      card: {
        findMany: async () => [],
      },
    },
  });

  const {
    buildAutopilotStateSnapshot,
    buildAutopilotStateSnapshotHash: buildHash,
    computeEngineDecisionIdV1: computeIdV1,
  } = requireModule('@/lib/autopilot/engineDecisionId') as typeof import('../lib/autopilot/engineDecisionId');

  const baseParams = {
    userId: 'user-1',
    category: RewardCategory.DINING,
    effectiveAt: new Date('2024-01-01T12:00:30.000Z'),
  };

  const cardsA = [
    { id: 'card-old', nickname: 'Alpha', issuer: 'Issuer A', network: 'VISA', isCredit: true },
  ];
  const cardsB = [
    { id: 'card-new', nickname: 'Alpha', issuer: 'Issuer A', network: 'VISA', isCredit: true },
  ];

  const snapshotA = await buildAutopilotStateSnapshot({ ...baseParams, cards: cardsA });
  const snapshotB = await buildAutopilotStateSnapshot({ ...baseParams, cards: cardsB });

  const idA = computeIdV1({
    userId: 'user-1',
    source: RecommendationSource.AUTOPILOT,
    amountCents: 25_00,
    currency: 'usd',
    merchantName: 'Test Shop',
    category: RewardCategory.DINING,
    effectiveAt: baseParams.effectiveAt,
    stateSnapshotHash: buildHash(snapshotA),
  });

  const idB = computeIdV1({
    userId: 'user-1',
    source: RecommendationSource.AUTOPILOT,
    amountCents: 25_00,
    currency: 'USD',
    merchantName: 'Test Shop',
    category: RewardCategory.DINING,
    effectiveAt: baseParams.effectiveAt,
    stateSnapshotHash: buildHash(snapshotB),
  });

  assert.equal(idA, idB, 'Semantic equivalence across row-id changes should not change the id');
}

async function runUpsertIdempotencySuite() {
  resetModules();

  const sessions = new Map<string, { id: string; recommendedBucketId: string | null }>();
  const commits = new Map<string, { id: string; decisionId: string; sessionId: string }>();
  let sessionSeq = 1;
  type RecommendationSessionUpsertArgs = {
    where: {
      userId_source_engineDecisionId: {
        userId: string;
        source: RecommendationSource;
        engineDecisionId: string;
      };
    };
    create: { recommendedBucketId?: string | null; [key: string]: unknown };
    update: { recommendedBucketId?: string | null; [key: string]: unknown };
    select?: { id: boolean; recommendedBucketId: boolean };
  };
  type AutopilotCommitCreateArgs = { data: { userId: string; decisionId: string; sessionId: string } };
  type SimulatedTransactionCreateArgs = { data: { id: string } };

  mockModule(requireModule.resolve('@/lib/metrics/autopilot'), {
    incrementCounter: () => {},
    observeDuration: () => {},
  });
  mockModule(requireModule.resolve('@/lib/log'), {
    logInvariantViolation: () => {},
    logGuardrailEvent: () => {},
  });
  mockModule(requireModule.resolve('@/lib/engine/public'), {
    getAutopilotDecisionForUserSwipe: async () => ({
      kind: 'OK',
      cardId: 'card-1',
      reasonCode: 'MAX_REWARDS',
      userFacingMessage: 'Use card-1',
      expectedMonetaryBenefitCents: 250,
      bucketDelta: {
        bucketId: 'bucket-1',
        newSpentCents: 25_000,
        newRemainingCents: 75_000,
      },
    }),
  });
  mockModule(requireModule.resolve('@/lib/scan-helpers'), {
    resolveScanCategory: async () => RewardCategory.DINING,
  });
  mockModule(requireModule.resolve('@/lib/sessions/confirm-service'), {
    confirmRecommendationSession: async () => {},
    SessionConfirmError: class SessionConfirmError extends Error {
      status = 400;
      code = 'TEST';
      detail?: unknown;
    },
  });
  mockModule(requireModule.resolve('@/lib/buckets/ensure-fresh'), {
    ensureBucketFresh: async () => null,
  });
  mockModule(requireModule.resolve('@/lib/prisma'), {
    prisma: {
      card: {
        findMany: async () => [
          { id: 'card-1', nickname: 'Alpha', issuer: null, network: 'VISA', isCredit: true },
        ],
      },
      rewardRule: {
        findMany: async () => [
          {
            id: 'rr-1',
            cardId: 'card-1',
            category: RewardCategory.DINING,
            multiplier: 3,
            cashbackPercent: null,
            capAmount: null,
          },
          {
            id: 'rr-2',
            cardId: 'card-1',
            category: RewardCategory.OTHER,
            multiplier: 1,
            cashbackPercent: null,
            capAmount: null,
          },
        ],
      },
      bucket: {
        findMany: async () => [
          {
            id: 'bucket-1',
            userId: 'user-1',
            name: 'Dining',
            period: BucketPeriod.MONTHLY,
            budgetAmount: 100_000,
            currentAmount: 100_000,
            spentCents: 20_000,
            strictMode: true,
            category: RewardCategory.DINING,
            periodStart: new Date('2024-01-01T00:00:00.000Z'),
            periodEnd: new Date('2024-02-01T00:00:00.000Z'),
            lastResetAt: null,
            createdAt: new Date('2023-12-01T00:00:00.000Z'),
            updatedAt: new Date('2023-12-01T00:00:00.000Z'),
          },
        ],
        findUnique: async () => ({ name: 'Dining' }),
      },
      dailyState: {
        findFirst: async () => null,
      },
      categoryPreference: {
        findUnique: async () => null,
      },
      user: {
        findUnique: async () => ({
          engineObjectiveProfile: 'BALANCED',
          engineObjectiveWeights: null,
        }),
      },
      recommendationSession: {
        count: async () => 0,
        upsert: async ({ where, create, update, select }: RecommendationSessionUpsertArgs) => {
          const keyParts = where.userId_source_engineDecisionId;
          const key = `${keyParts.userId}:${keyParts.source}:${keyParts.engineDecisionId}`;
          const existing = sessions.get(key);
          if (existing) {
            const updated = {
              ...existing,
              recommendedBucketId:
                update.recommendedBucketId ?? existing.recommendedBucketId ?? null,
            };
            sessions.set(key, updated);
            return select
              ? { id: updated.id, recommendedBucketId: updated.recommendedBucketId }
              : updated;
          }

          const record = {
            id: `session-${sessionSeq++}`,
            recommendedBucketId: create.recommendedBucketId ?? null,
          };
          sessions.set(key, record);
          return select
            ? { id: record.id, recommendedBucketId: record.recommendedBucketId }
            : record;
        },
      },
      cherryPointLedger: {
        aggregate: async () => ({ _sum: { points: 0 } }),
      },
      decisionEvent: {
        create: async () => ({}),
      },
      autopilotCommit: {
        findUnique: async () => null,
        create: async ({ data }: AutopilotCommitCreateArgs) => {
          const key = `${data.userId}:${data.decisionId}`;
          if (commits.has(key)) {
            return commits.get(key)!;
          }
          const record = { id: `commit-${commits.size + 1}`, ...data };
          commits.set(key, record);
          return record;
        },
      },
      simulatedTransaction: {
        findUnique: async () => null,
        create: async ({ data }: SimulatedTransactionCreateArgs) => ({ id: data.id }),
      },
    },
  });

  const { commitAutopilotDecisionV2, getAutopilotPreview } = requireModule(
    '@/lib/autopilot/service'
  ) as {
    commitAutopilotDecisionV2: (
      world: World,
      userId: string,
      input: AutopilotCommitInput,
      options: { now: Date }
    ) => Promise<{ decisionId: string; sessionId: string; bucket: unknown; status: string }>;
    getAutopilotPreview: (
      world: World,
      userId: string,
      input: AutopilotPreviewInput,
      options: { now: Date }
    ) => Promise<AutopilotPreviewOutput>;
  };

  const input: AutopilotCommitInput = {
    decisionId: '',
    merchant: 'Test Shop',
    amountCents: 25_00,
    cardId: 'card-1',
    occurredAt: '2024-01-02T12:00:00.000Z',
    category: 'DINING',
  };
  const now = new Date('2024-01-02T12:00:00.000Z');
  const { world } = makeTestWorld({ nowMs: now.getTime() });
  const preview = await getAutopilotPreview(world, 'user-1', input, { now });
  input.decisionId = preview.decisionId;

  const first = await commitAutopilotDecisionV2(world, 'user-1', input, { now });
  input.decisionId = first.decisionId;
  const second = await commitAutopilotDecisionV2(world, 'user-1', input, { now });

  assert.equal(first.decisionId, second.decisionId, 'Decision ids should stay stable');
  assert.equal(first.sessionId, second.sessionId, 'Session upsert should reuse the same record');
  assert.equal(sessions.size, 1, 'Only one session should exist for identical fingerprint');
  assert.equal(commits.size, 1, 'Commit should be deduped for identical decision ids');
}

async function run() {
  await runDeterminismSuite();
  await runSemanticStabilityAcrossRowIds();
  await runUpsertIdempotencySuite();
  process.stdout.write('autopilot-idempotency-key: ok\n');
}

run().catch((err) => {
  const message =
    err instanceof Error ? err.stack ?? err.message : typeof err === 'string' ? err : JSON.stringify(err);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
