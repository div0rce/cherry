import assert from 'node:assert/strict';
import { CategoryBudgetMode, DailyStateStatus, RewardCategory } from '@prisma/client';
import { createRequire } from 'node:module';

const requireFn = createRequire(import.meta.url);
requireFn('ts-node/register/transpile-only');

const { simulateSpendAuthority, recordDecisionEvent } = requireFn(
  '../lib/authority/simulateSpendAuthority.ts'
) as typeof import('../lib/authority/simulateSpendAuthority.ts');
type AuthorityPrismaClient =
  import('../lib/authority/simulateSpendAuthority.ts').AuthorityPrismaClient;
type DecisionEventClient =
  import('../lib/authority/simulateSpendAuthority.ts').DecisionEventClient;

function buildStubClient(overrides: {
  dailyStateStatus?: DailyStateStatus;
  safeToSpendCents?: number | null;
  categoryPreferenceMode?: CategoryBudgetMode | null;
  pendingSessions?: number;
  pendingPoints?: number;
  buckets?: Array<Record<string, unknown>>;
} = {}): AuthorityPrismaClient {
  const buckets =
    overrides.buckets ??
    [
      {
        id: 'bucket-1',
        userId: 'user-1',
        name: 'Dining',
        period: 'MONTHLY',
        budgetAmount: 10_000,
        currentAmount: 9_000,
        spentCents: 1_000,
        strictMode: true,
        category: RewardCategory.DINING,
        periodStart: new Date('2024-01-01T00:00:00Z'),
        periodEnd: new Date('2024-02-01T00:00:00Z'),
        lastResetAt: null,
        simulations: [],
        recommendationSessions: [],
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      },
    ];

  return {
    dailyState: {
      findFirst: async () =>
        overrides.dailyStateStatus !== undefined
          ? {
              status: overrides.dailyStateStatus,
              safeToSpendCents:
                overrides.safeToSpendCents === undefined ? 15_000 : overrides.safeToSpendCents,
              inputsVersion: 'ds-hash',
            }
          : null,
    },
    bucket: {
      findMany: async () => buckets,
    },
    categoryPreference: {
      findUnique: async () =>
        overrides.categoryPreferenceMode !== undefined
          ? { mode: overrides.categoryPreferenceMode }
          : null,
    },
    recommendationSession: {
      count: async () => overrides.pendingSessions ?? 0,
    },
    cherryPointLedger: {
      aggregate: async () => ({
        _sum: { points: overrides.pendingPoints ?? 0 },
      }),
    },
  } as unknown as AuthorityPrismaClient;
}

async function main(): Promise<void> {
  const now = new Date('2024-01-02T00:00:00Z');
  const client = buildStubClient({
    dailyStateStatus: DailyStateStatus.SAFE,
    categoryPreferenceMode: CategoryBudgetMode.BUDGETED,
  });

  const baseParams = {
    userId: 'user-1',
    amountCents: 2_500,
    category: RewardCategory.DINING,
    surface: 'simulate' as const,
  };

  const first = await simulateSpendAuthority(baseParams, { prisma: client, now });
  const second = await simulateSpendAuthority(baseParams, { prisma: client, now });

  assert.equal(first.inputsVersion, second.inputsVersion);
  assert.deepEqual(first, second);

  const severityFromReasons = first.reasons.reduce((acc, r) => Math.max(acc, r.severity), 0);
  assert.equal(first.severity, severityFromReasons);
  assert.ok(first.reasons.length >= 1);

  const changed = await simulateSpendAuthority(
    { ...baseParams, amountCents: baseParams.amountCents + 123 },
    { prisma: client, now }
  );
  assert.notEqual(first.inputsVersion, changed.inputsVersion);

  for (const cf of first.counterfactuals) {
    const cfSeverity = cf.reasons.reduce((acc, r) => Math.max(acc, r.severity), 0);
    assert.equal(cf.severity, cfSeverity);
    assert.ok(cf.reasons.length >= 1);
  }

  const recorded: Array<Record<string, unknown>> = [];
  const db: DecisionEventClient = {
    decisionEvent: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        recorded.push(data);
        return data;
      },
    },
  };

  await recordDecisionEvent({
    userId: baseParams.userId,
    surface: baseParams.surface,
    params: baseParams,
    decision: first,
    db,
  });

  assert.equal(recorded.length, 1);
  const event = recorded[0];
  if (event === undefined) {
    throw new Error('DecisionEvent was not recorded');
  }
  const requiredFields = [
    'userId',
    'surface',
    'amountCents',
    'category',
    'verdict',
    'reasonCode',
    'reasonCodes',
    'severity',
    'inputsVersion',
    'counterfactuals',
  ];
  for (const field of requiredFields) {
    assert.ok(
      Object.hasOwn(event, field),
      `DecisionEvent missing field ${field as string}`
    );
  }
  const reasonCodes = event['reasonCodes'];
  assert.ok(Array.isArray(reasonCodes));
  assert.ok((reasonCodes as unknown[]).length >= 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
