import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { CategoryBudgetMode, DailyStateStatus, RewardCategory } from '@prisma/client';
import {
  simulateSpendAuthorityFromSnapshot,
  type AuthoritySnapshot,
} from '../../lib/authority/simulateSpendAuthority';
import { AuthorityReason, AUTHORITY_REASON_SEVERITY } from '../../lib/authority/reasonCodes';
import { getServerConfig } from '../../lib/config/store';

const fixedNowMs = new Date('2024-01-02T00:00:00Z').getTime();
const digest = {
  sha256: (payload: string) => crypto.createHash('sha256').update(payload).digest('hex'),
};

type StubOptions = {
  dailyStateStatus?: DailyStateStatus;
  safeToSpendCents?: number | null;
  categoryPreferenceMode?: CategoryBudgetMode | null;
  pendingSessions?: number;
  pendingPoints?: number;
  buckets?: AuthoritySnapshot['buckets'];
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

async function scenarioDecision(overrides: Partial<StubOptions> = {}, amountCents = 2_000) {
  const snapshot = buildSnapshot({
    dailyStateStatus: DailyStateStatus.SAFE,
    ...overrides,
  });
  return simulateSpendAuthorityFromSnapshot(
    {
      userId: 'user-1',
      amountCents,
      category: RewardCategory.DINING,
      surface: 'simulate',
    },
    {
      nowMs: fixedNowMs,
      snapshot,
      engineVersion: getServerConfig().engineVersion,
      digest,
    }
  );
}

async function testReasonExhaustiveness() {
  const expectations: Array<{ reason: AuthorityReason; snapshot: AuthoritySnapshot; amount?: number }> =
    [
      {
        reason: AuthorityReason.CATEGORY_RESTRICTED,
        snapshot: buildSnapshot({
          dailyStateStatus: DailyStateStatus.SAFE,
          categoryPreferenceMode: CategoryBudgetMode.UNBUDGETED,
        }),
      },
      {
        reason: AuthorityReason.DAILY_STATE_RISKY,
        snapshot: buildSnapshot({ dailyStateStatus: DailyStateStatus.RISKY }),
      },
      {
        reason: AuthorityReason.BUCKET_EXHAUSTED,
        snapshot: buildSnapshot({
          dailyStateStatus: DailyStateStatus.SAFE,
          buckets: [buildBucket({ budgetAmount: 1_000, remainingCents: 0 })],
        }),
      },
      {
        reason: AuthorityReason.VERIFICATION_PENDING,
        snapshot: buildSnapshot({
          dailyStateStatus: DailyStateStatus.SAFE,
          pendingSessions: 1,
          pendingPoints: 50,
        }),
      },
      {
        reason: AuthorityReason.ESSENTIAL_BUFFER_LOW,
        snapshot: buildSnapshot({
          dailyStateStatus: DailyStateStatus.TIGHT,
          safeToSpendCents: 1_500,
        }),
      },
      {
        reason: AuthorityReason.AMOUNT_SPIKE,
        snapshot: buildSnapshot({
          dailyStateStatus: DailyStateStatus.SAFE,
          safeToSpendCents: 12_000,
          buckets: [buildBucket({ budgetAmount: 20_000, remainingCents: 18_000 })],
        }),
        amount: 15_000,
      },
    ];

  for (const { reason, snapshot, amount } of expectations) {
    const decision = await simulateSpendAuthorityFromSnapshot(
      {
        userId: 'user-1',
        amountCents: amount ?? 2_000,
        category: RewardCategory.DINING,
        surface: 'simulate',
      },
      {
        nowMs: fixedNowMs,
        snapshot,
        engineVersion: getServerConfig().engineVersion,
        digest,
      }
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
    buckets: [buildBucket({ budgetAmount: 2_000, remainingCents: 0 })],
  });

  const maxSeverity = decision.reasons.reduce((acc, r) => Math.max(acc, r.severity), 0);
  assert.equal(decision.severity, maxSeverity, 'Decision severity must be max(reasons.severity)');

  const counterfactual = decision.counterfactuals.at(0);
  if (counterfactual) {
    const cfMaxSeverity = counterfactual.reasons.reduce((acc, r) => Math.max(acc, r.severity), 0);
    assert.equal(counterfactual.severity, cfMaxSeverity, 'Counterfactual severity must match reasons');
  }

  const reducedAmountDecision = await simulateSpendAuthorityFromSnapshot(
    {
      userId: 'user-1',
      amountCents: 20_000,
      category: RewardCategory.DINING,
      surface: 'simulate',
      counterfactuals: [{ amountCents: 5_000 }],
    },
    {
      snapshot: buildSnapshot({
        dailyStateStatus: DailyStateStatus.SAFE,
        safeToSpendCents: 15_000,
        buckets: [buildBucket({ budgetAmount: 25_000, remainingCents: 23_000 })],
      }),
      nowMs: fixedNowMs,
      engineVersion: getServerConfig().engineVersion,
      digest,
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
  const snapshot = buildSnapshot();
  const baseParams = {
    userId: 'user-1',
    amountCents: 2_500,
    category: RewardCategory.DINING,
    surface: 'simulate' as const,
  };

  const first = await simulateSpendAuthorityFromSnapshot(baseParams, {
    snapshot,
    nowMs: fixedNowMs,
    engineVersion: getServerConfig().engineVersion,
    digest,
  });
  const second = await simulateSpendAuthorityFromSnapshot(baseParams, {
    snapshot,
    nowMs: fixedNowMs,
    engineVersion: getServerConfig().engineVersion,
    digest,
  });
  assert.deepEqual(first, second, 'Same inputs must yield identical decisions');
  assert.equal(first.inputsVersion.length, 64, 'inputsVersion should be a sha256 hex string');
  assert.match(first.inputsVersion, /^[0-9a-f]{64}$/);

  const amountChanged = await simulateSpendAuthorityFromSnapshot(
    { ...baseParams, amountCents: baseParams.amountCents + 1 },
    {
      snapshot,
      nowMs: fixedNowMs,
      engineVersion: getServerConfig().engineVersion,
      digest,
    }
  );
  assert.notEqual(first.inputsVersion, amountChanged.inputsVersion, 'Amount change must alter hash');

  const categoryChanged = await simulateSpendAuthorityFromSnapshot(
    { ...baseParams, category: RewardCategory.GROCERIES },
    {
      snapshot,
      nowMs: fixedNowMs,
      engineVersion: getServerConfig().engineVersion,
      digest,
    }
  );
  assert.notEqual(first.inputsVersion, categoryChanged.inputsVersion, 'Category change must alter hash');

  const surfaceChanged = await simulateSpendAuthorityFromSnapshot(
    { ...baseParams, surface: 'scan' },
    {
      snapshot,
      nowMs: fixedNowMs,
      engineVersion: getServerConfig().engineVersion,
      digest,
    }
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
