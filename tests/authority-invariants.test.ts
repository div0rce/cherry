import * as assert from 'node:assert/strict';
import * as crypto from 'node:crypto';
import { CategoryBudgetMode, DailyStateStatus, RewardCategory } from '@prisma/client';
import {
  simulateSpendAuthorityFromSnapshot,
  type AuthoritySnapshot,
} from '../lib/authority/simulateSpendAuthority';
import { AuthorityReason } from '../lib/authority/reasonCodes';
import { getServerConfig } from '../lib/config/store';

type StubOptions = {
  dailyStateStatus?: DailyStateStatus;
  safeToSpendCents?: number | null;
  categoryPreferenceMode?: CategoryBudgetMode | null;
  pendingSessions?: number;
  pendingPoints?: number;
  buckets?: AuthoritySnapshot['buckets'];
};

const fixedNowMs = new Date('2024-01-02T00:00:00Z').getTime();
const digest = {
  sha256: (payload: string) => crypto.createHash('sha256').update(payload).digest('hex'),
};

function buildBucket(
  overrides: Partial<AuthoritySnapshot['buckets'][number]> = {}
): AuthoritySnapshot['buckets'][number] {
  return {
    id: 'bucket-1',
    budgetAmount: 10_000,
    remainingCents: 9_000,
    strictMode: true,
    category: RewardCategory.DINING,
    periodEndMs: new Date('2024-02-01T00:00:00Z').getTime(),
    ...overrides,
  };
}

function buildSnapshot(options: StubOptions = {}): AuthoritySnapshot {
  const buckets = options.buckets ?? [buildBucket()];
  return {
    dailyState:
      options.dailyStateStatus !== undefined
        ? {
            status: options.dailyStateStatus,
            safeToSpendCents:
              options.safeToSpendCents === undefined ? 15_000 : options.safeToSpendCents,
            inputsVersion: 'ds-hash',
          }
        : null,
    buckets,
    categoryPreferenceMode:
      options.categoryPreferenceMode !== undefined ? options.categoryPreferenceMode : null,
    pendingSessions: options.pendingSessions ?? 0,
    pendingPoints: options.pendingPoints ?? 0,
  };
}

async function testDeterministicInputs() {
  const snapshot = buildSnapshot();
  const params = {
    userId: 'user-1',
    amountCents: 2_500,
    category: RewardCategory.DINING,
    surface: 'simulate' as const,
  };
  const first = await simulateSpendAuthorityFromSnapshot(params, {
    snapshot,
    nowMs: fixedNowMs,
    engineVersion: getServerConfig().engineVersion,
    digest,
  });
  const second = await simulateSpendAuthorityFromSnapshot(params, {
    snapshot,
    nowMs: fixedNowMs,
    engineVersion: getServerConfig().engineVersion,
    digest,
  });

  assert.equal(first.verdict, second.verdict);
  assert.equal(first.inputsVersion, second.inputsVersion);
  assert.equal(first.inputsVersion.length, 64, 'inputsVersion should be a sha256 hex string');
  assert.match(first.inputsVersion, /^[0-9a-f]{64}$/);
}

async function testSafeStateNotFlaggedWithoutRestriction() {
  const snapshot = buildSnapshot({
    dailyStateStatus: DailyStateStatus.SAFE,
    categoryPreferenceMode: CategoryBudgetMode.BUDGETED,
    buckets: [buildBucket({ budgetAmount: 5_000, remainingCents: 1_000 })],
  });
  const decision = await simulateSpendAuthorityFromSnapshot(
    {
      userId: 'user-1',
      amountCents: 1_000,
      category: RewardCategory.DINING,
      surface: 'scan',
    },
    {
      snapshot,
      nowMs: fixedNowMs,
      engineVersion: getServerConfig().engineVersion,
      digest,
    }
  );

  assert.notEqual(decision.verdict, 'FLAG_SIMULATED');
}

async function testNoMutation() {
  const bucket = buildBucket({ budgetAmount: 8_000, remainingCents: 6_000 });
  const snapshotBefore = { ...bucket };
  const snapshot = buildSnapshot({
    dailyStateStatus: DailyStateStatus.SAFE,
    buckets: [bucket],
  });

  await simulateSpendAuthorityFromSnapshot(
    {
      userId: 'user-1',
      amountCents: 500,
      category: RewardCategory.DINING,
      surface: 'simulate',
    },
    {
      snapshot,
      nowMs: fixedNowMs,
      engineVersion: getServerConfig().engineVersion,
      digest,
    }
  );

  assert.deepEqual(bucket, snapshotBefore);
}

async function testNonAllowHasReason() {
  const snapshot = buildSnapshot({
    dailyStateStatus: DailyStateStatus.SAFE,
    buckets: [buildBucket({ budgetAmount: 2_000, remainingCents: 0 })],
  });
  const decision = await simulateSpendAuthorityFromSnapshot(
    {
      userId: 'user-1',
      amountCents: 500,
      category: RewardCategory.DINING,
      surface: 'simulate',
    },
    {
      snapshot,
      nowMs: fixedNowMs,
      engineVersion: getServerConfig().engineVersion,
      digest,
    }
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
    snapshot: AuthoritySnapshot;
    amountCents?: number;
  }> = [
    {
      expected: AuthorityReason.CATEGORY_RESTRICTED,
      snapshot: buildSnapshot({
        dailyStateStatus: DailyStateStatus.SAFE,
        categoryPreferenceMode: CategoryBudgetMode.UNBUDGETED,
      }),
    },
    {
      expected: AuthorityReason.DAILY_STATE_RISKY,
      snapshot: buildSnapshot({ dailyStateStatus: DailyStateStatus.RISKY }),
    },
    {
      expected: AuthorityReason.BUCKET_EXHAUSTED,
      snapshot: buildSnapshot({
        dailyStateStatus: DailyStateStatus.SAFE,
        buckets: [buildBucket({ budgetAmount: 1_000, remainingCents: 0 })],
      }),
    },
    {
      expected: AuthorityReason.VERIFICATION_PENDING,
      snapshot: buildSnapshot({
        dailyStateStatus: DailyStateStatus.SAFE,
        pendingSessions: 2,
        pendingPoints: 100,
      }),
    },
    {
      expected: AuthorityReason.ESSENTIAL_BUFFER_LOW,
      snapshot: buildSnapshot({
        dailyStateStatus: DailyStateStatus.TIGHT,
        safeToSpendCents: 1_500,
      }),
    },
    {
      expected: AuthorityReason.AMOUNT_SPIKE,
      snapshot: buildSnapshot({
        dailyStateStatus: DailyStateStatus.SAFE,
        safeToSpendCents: 12_000,
        buckets: [buildBucket({ budgetAmount: 20_000, remainingCents: 18_000 })],
      }),
      amountCents: 15_000,
    },
  ];

  for (const scenario of scenarios) {
    const decision = await simulateSpendAuthorityFromSnapshot(
      {
        userId: 'user-1',
        amountCents: scenario.amountCents ?? 2_000,
        category: RewardCategory.DINING,
        surface: 'simulate',
      },
      {
        snapshot: scenario.snapshot,
        nowMs: fixedNowMs,
        engineVersion: getServerConfig().engineVersion,
        digest,
      }
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
