import assert from 'node:assert/strict';
import { CategoryBudgetMode, DailyStateStatus, RewardCategory } from '@prisma/client';
import {
  simulateSpendAuthority,
  type AuthorityPrismaClient,
} from '@/lib/authority/simulateSpendAuthority';
import { AuthorityReason, AUTHORITY_REASON_SEVERITY } from '@/lib/authority/reasonCodes';

const fixedNow = new Date('2024-01-02T00:00:00Z');

type StubOptions = {
  dailyStateStatus?: DailyStateStatus;
  safeToSpendCents?: number | null;
  categoryPreferenceMode?: CategoryBudgetMode | null;
  pendingSessions?: number;
  pendingPoints?: number;
  buckets?: Array<Record<string, unknown>>;
};

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

async function scenarioDecision(overrides: Partial<StubOptions> = {}, amountCents = 2_000) {
  const client = buildClient({
    dailyStateStatus: DailyStateStatus.SAFE,
    ...overrides,
  });
  return simulateSpendAuthority(
    {
      userId: 'user-1',
      amountCents,
      category: RewardCategory.DINING,
      surface: 'simulate',
    },
    { prisma: client, now: fixedNow }
  );
}

async function testReasonExhaustiveness() {
  const expectations: Array<{ reason: AuthorityReason; client: AuthorityPrismaClient; amount?: number }> =
    [
      {
        reason: AuthorityReason.CATEGORY_RESTRICTED,
        client: buildClient({
          dailyStateStatus: DailyStateStatus.SAFE,
          categoryPreferenceMode: CategoryBudgetMode.UNBUDGETED,
        }),
      },
      {
        reason: AuthorityReason.DAILY_STATE_RISKY,
        client: buildClient({ dailyStateStatus: DailyStateStatus.RISKY }),
      },
      {
        reason: AuthorityReason.BUCKET_EXHAUSTED,
        client: buildClient({
          dailyStateStatus: DailyStateStatus.SAFE,
          buckets: [buildBucket({ budgetAmount: 1_000, spentCents: 1_000 })],
        }),
      },
      {
        reason: AuthorityReason.VERIFICATION_PENDING,
        client: buildClient({
          dailyStateStatus: DailyStateStatus.SAFE,
          pendingSessions: 1,
          pendingPoints: 50,
        }),
      },
      {
        reason: AuthorityReason.ESSENTIAL_BUFFER_LOW,
        client: buildClient({
          dailyStateStatus: DailyStateStatus.TIGHT,
          safeToSpendCents: 1_500,
        }),
      },
      {
        reason: AuthorityReason.AMOUNT_SPIKE,
        client: buildClient({
          dailyStateStatus: DailyStateStatus.SAFE,
          safeToSpendCents: 12_000,
          buckets: [buildBucket({ budgetAmount: 20_000, spentCents: 2_000 })],
        }),
        amount: 15_000,
      },
    ];

  for (const { reason, client, amount } of expectations) {
    const decision = await simulateSpendAuthority(
      {
        userId: 'user-1',
        amountCents: amount ?? 2_000,
        category: RewardCategory.DINING,
        surface: 'simulate',
      },
      { prisma: client, now: fixedNow }
    );
    const codes = decision.reasons.map((r) => r.code);
    assert.ok(
      codes.includes(reason),
      `Expected reason ${reason} to be present; got ${codes.join(',')}`
    );
  }
}

async function testSeverityLattice() {
  const decision = await scenarioDecision({
    buckets: [buildBucket({ budgetAmount: 2_000, spentCents: 2_000 })],
  });

  const maxSeverity = decision.reasons.reduce((acc, r) => Math.max(acc, r.severity), 0);
  assert.equal(decision.severity, maxSeverity, 'Decision severity must be max(reasons.severity)');

  const counterfactual = decision.counterfactuals.at(0);
  if (counterfactual) {
    const cfMaxSeverity = counterfactual.reasons.reduce((acc, r) => Math.max(acc, r.severity), 0);
    assert.equal(counterfactual.severity, cfMaxSeverity, 'Counterfactual severity must match reasons');
  }

  const reducedAmountDecision = await simulateSpendAuthority(
    {
      userId: 'user-1',
      amountCents: 20_000,
      category: RewardCategory.DINING,
      surface: 'simulate',
      counterfactuals: [{ amountCents: 5_000 }],
    },
    {
      prisma: buildClient({
        dailyStateStatus: DailyStateStatus.SAFE,
        safeToSpendCents: 15_000,
        buckets: [buildBucket({ budgetAmount: 25_000, spentCents: 2_000 })],
      }),
      now: fixedNow,
    }
  );

  const baseSeverity = reducedAmountDecision.severity;
  const cfSeverity = reducedAmountDecision.counterfactuals.at(0)?.severity ?? baseSeverity;
  assert.ok(
    cfSeverity <= baseSeverity,
    'Counterfactual severity should not exceed base severity when amount is reduced'
  );
}

async function testDeterminismAndHashing() {
  const client = buildClient();
  const baseParams = {
    userId: 'user-1',
    amountCents: 2_500,
    category: RewardCategory.DINING,
    surface: 'simulate' as const,
  };

  const first = await simulateSpendAuthority(baseParams, { prisma: client, now: fixedNow });
  const second = await simulateSpendAuthority(baseParams, { prisma: client, now: fixedNow });
  assert.deepEqual(first, second, 'Same inputs must yield identical decisions');

  const amountChanged = await simulateSpendAuthority(
    { ...baseParams, amountCents: baseParams.amountCents + 1 },
    { prisma: client, now: fixedNow }
  );
  assert.notEqual(first.inputsVersion, amountChanged.inputsVersion, 'Amount change must alter hash');

  const categoryChanged = await simulateSpendAuthority(
    { ...baseParams, category: RewardCategory.GROCERIES },
    { prisma: client, now: fixedNow }
  );
  assert.notEqual(first.inputsVersion, categoryChanged.inputsVersion, 'Category change must alter hash');

  const surfaceChanged = await simulateSpendAuthority(
    { ...baseParams, surface: 'scan' },
    { prisma: client, now: fixedNow }
  );
  assert.notEqual(first.inputsVersion, surfaceChanged.inputsVersion, 'Surface change must alter hash');
}

async function testLanguageFirewall() {
  const decision = await scenarioDecision();
  const forbidden = [/approve/i, /decline/i, /block/i, /route/i, /authorization/i, /auth loop/i];

  const fieldsToCheck = [
    decision.verdict,
    decision.explanation,
    ...decision.reasons.map((r) => r.detail),
  ];

  for (const token of forbidden) {
    const hit = fieldsToCheck.some((text) => token.test(text));
    assert.equal(hit, false, `Forbidden token ${token} found in authority payload`);
  }
}

async function testVersionEnforcement() {
  const decision = await scenarioDecision();
  assert.equal(decision.version, 'authority_v1');
  assert.ok(
    Object.values(AuthorityReason).every((reason) => AUTHORITY_REASON_SEVERITY[reason] !== undefined),
    'Severity map must remain exhaustive'
  );
}

async function run(): Promise<void> {
  await testReasonExhaustiveness();
  await testSeverityLattice();
  await testDeterminismAndHashing();
  await testLanguageFirewall();
  await testVersionEnforcement();

  process.stdout.write('authority-phase1: ok\n');
}

run().catch((err) => {
  const message =
    err instanceof Error ? err.stack ?? err.message : typeof err === 'string' ? err : JSON.stringify(err);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
