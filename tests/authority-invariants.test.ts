import assert from 'node:assert/strict';
import { CategoryBudgetMode, DailyStateStatus, RewardCategory } from '@prisma/client';
import {
  simulateSpendAuthority,
  type AuthorityPrismaClient,
} from '../lib/authority/simulateSpendAuthority';
import { AuthorityReason } from '../lib/authority/reasonCodes';

type StubOptions = {
  dailyStateStatus?: DailyStateStatus;
  safeToSpendCents?: number | null;
  categoryPreferenceMode?: CategoryBudgetMode | null;
  pendingSessions?: number;
  pendingPoints?: number;
  buckets?: Array<Record<string, unknown>>;
};

const fixedNow = new Date('2024-01-02T00:00:00Z');

function buildBucket(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const start = new Date('2024-01-01T00:00:00Z');
  const end = new Date('2024-02-01T00:00:00Z');
  return {
    id: 'bucket-1',
    userId: 'user-1',
    name: 'Dining',
    period: 'MONTHLY',
    budgetAmount: 10_000,
    currentAmount: 9_000,
    spentCents: 1_000,
    strictMode: true,
    category: RewardCategory.DINING,
    periodStart: start,
    periodEnd: end,
    lastResetAt: null,
    simulations: [],
    recommendationSessions: [],
    createdAt: start,
    updatedAt: start,
    ...overrides,
  };
}

function buildClient(options: StubOptions = {}): AuthorityPrismaClient {
  const buckets = options.buckets ?? [buildBucket()];
  return {
    dailyState: {
      findFirst: async () =>
        options.dailyStateStatus !== undefined
          ? {
              status: options.dailyStateStatus,
              safeToSpendCents:
                options.safeToSpendCents === undefined ? 15_000 : options.safeToSpendCents,
              inputsVersion: 'ds-hash',
            }
          : null,
    },
    bucket: {
      findMany: async () => buckets,
    },
    categoryPreference: {
      findUnique: async () =>
        options.categoryPreferenceMode !== undefined
          ? { mode: options.categoryPreferenceMode }
          : null,
    },
    recommendationSession: {
      count: async () => options.pendingSessions ?? 0,
    },
    cherryPointLedger: {
      aggregate: async () => ({
        _sum: { points: options.pendingPoints ?? 0 },
      }),
    },
  } as unknown as AuthorityPrismaClient;
}

async function testDeterministicInputs() {
  const client = buildClient();
  const params = {
    userId: 'user-1',
    amountCents: 2_500,
    category: RewardCategory.DINING,
    surface: 'simulate' as const,
  };
  const first = await simulateSpendAuthority(params, { prisma: client, now: fixedNow });
  const second = await simulateSpendAuthority(params, { prisma: client, now: fixedNow });

  assert.equal(first.verdict, second.verdict);
  assert.equal(first.inputsVersion, second.inputsVersion);
}

async function testSafeStateNotFlaggedWithoutRestriction() {
  const client = buildClient({
    dailyStateStatus: DailyStateStatus.SAFE,
    categoryPreferenceMode: CategoryBudgetMode.BUDGETED,
    buckets: [buildBucket({ budgetAmount: 5_000, spentCents: 4_000 })],
  });
  const decision = await simulateSpendAuthority(
    {
      userId: 'user-1',
      amountCents: 1_000,
      category: RewardCategory.DINING,
      surface: 'scan',
    },
    { prisma: client, now: fixedNow }
  );

  assert.notEqual(decision.verdict, 'FLAG_SIMULATED');
}

async function testNoMutation() {
  const bucket = buildBucket({ budgetAmount: 8_000, spentCents: 2_000 });
  const snapshot = { ...bucket };
  const client = buildClient({
    dailyStateStatus: DailyStateStatus.SAFE,
    buckets: [bucket],
  });

  await simulateSpendAuthority(
    {
      userId: 'user-1',
      amountCents: 500,
      category: RewardCategory.DINING,
      surface: 'simulate',
    },
    { prisma: client, now: fixedNow }
  );

  assert.deepEqual(bucket, snapshot);
}

async function testNonAllowHasReason() {
  const client = buildClient({
    dailyStateStatus: DailyStateStatus.SAFE,
    buckets: [buildBucket({ budgetAmount: 2_000, spentCents: 2_000 })],
  });
  const decision = await simulateSpendAuthority(
    {
      userId: 'user-1',
      amountCents: 500,
      category: RewardCategory.DINING,
      surface: 'simulate',
    },
    { prisma: client, now: fixedNow }
  );

  if (decision.verdict !== 'ALLOW_SIMULATED') {
    assert.ok(decision.reasons.length > 0);
    assert.ok(
      decision.reasons.every((r) => Object.values(AuthorityReason).includes(r.code as AuthorityReason))
    );
  }
}

async function testReasonCoverage() {
  const scenarios: Array<{
    expected: AuthorityReason;
    client: AuthorityPrismaClient;
    amountCents?: number;
  }> = [
    {
      expected: AuthorityReason.CATEGORY_RESTRICTED,
      client: buildClient({
        dailyStateStatus: DailyStateStatus.SAFE,
        categoryPreferenceMode: CategoryBudgetMode.UNBUDGETED,
      }),
    },
    {
      expected: AuthorityReason.DAILY_STATE_RISKY,
      client: buildClient({ dailyStateStatus: DailyStateStatus.RISKY }),
    },
    {
      expected: AuthorityReason.BUCKET_EXHAUSTED,
      client: buildClient({
        dailyStateStatus: DailyStateStatus.SAFE,
        buckets: [buildBucket({ budgetAmount: 1_000, spentCents: 1_000 })],
      }),
    },
    {
      expected: AuthorityReason.VERIFICATION_PENDING,
      client: buildClient({
        dailyStateStatus: DailyStateStatus.SAFE,
        pendingSessions: 2,
        pendingPoints: 100,
      }),
    },
    {
      expected: AuthorityReason.ESSENTIAL_BUFFER_LOW,
      client: buildClient({
        dailyStateStatus: DailyStateStatus.TIGHT,
        safeToSpendCents: 1_500,
      }),
    },
    {
      expected: AuthorityReason.AMOUNT_SPIKE,
      client: buildClient({
        dailyStateStatus: DailyStateStatus.SAFE,
        safeToSpendCents: 12_000,
        buckets: [buildBucket({ budgetAmount: 20_000, spentCents: 2_000 })],
      }),
      amountCents: 15_000,
    },
  ];

  for (const scenario of scenarios) {
    const decision = await simulateSpendAuthority(
      {
        userId: 'user-1',
        amountCents: scenario.amountCents ?? 2_000,
        category: RewardCategory.DINING,
        surface: 'simulate',
      },
      { prisma: scenario.client, now: fixedNow }
    );

    const codes = decision.reasons.map((r) => r.code);
    assert.ok(codes.includes(scenario.expected));
    assert.ok(decision.explanation.length > 0);
  }
}

async function run() {
  await testDeterministicInputs();
  await testSafeStateNotFlaggedWithoutRestriction();
  await testNoMutation();
  await testNonAllowHasReason();
  await testReasonCoverage();
  console.warn('authority invariants: ok');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
