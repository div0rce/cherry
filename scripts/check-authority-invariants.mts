import assert from 'node:assert/strict';
import { CategoryBudgetMode, DailyStateStatus, RewardCategory } from '@prisma/client';
import {
  recordDecisionEventWithWriter,
  simulateSpendAuthorityFromSnapshot,
} from '../lib/authority/simulateSpendAuthority.ts';
import { initConfigFromEnv } from '../lib/config/init.ts';
import { getServerConfig } from '../lib/config/store.ts';
import { Sha256Digest } from '../lib/adapters/runtime/digest.sha256.ts';
import { ensureTsEsm } from './lib/ensure-ts-esm.mts';

ensureTsEsm();


type AuthoritySnapshot = import('../lib/authority/simulateSpendAuthority.ts').AuthoritySnapshot;
type SimulateSpendParams = import('../lib/authority/simulateSpendAuthority.ts').SimulateSpendParams;
type SimulatedAuthorityDecision =
  import('../lib/authority/simulateSpendAuthority.ts').SimulatedAuthorityDecision;
type DecisionEventWriter = import('../lib/authority/simulateSpendAuthority.ts').DecisionEventWriter;

const fixedNowMs = 1704153600000;
const fixedPeriodEndMs = 1706745600000;
const digest = Sha256Digest;

function buildSnapshot(overrides: Partial<AuthoritySnapshot> = {}): AuthoritySnapshot {
  return {
    dailyState: {
      status: DailyStateStatus.SAFE,
      safeToSpendCents: 15_000,
      inputsVersion: 'ds-hash',
    },
    buckets: [
      {
        id: 'bucket-1',
        category: RewardCategory.DINING,
        budgetAmount: 10_000,
        remainingCents: 9_000,
        strictMode: true,
        periodEndMs: fixedPeriodEndMs,
      },
    ],
    categoryPreferenceMode: CategoryBudgetMode.BUDGETED,
    pendingSessions: 0,
    pendingPoints: 0,
    ...overrides,
  };
}

async function main(): Promise<void> {
  if (process.env['NEXT_PUBLIC_SITE_VERSION'] == null) {
    process.env['NEXT_PUBLIC_SITE_VERSION'] = 'dev';
  }
  initConfigFromEnv(process.env);
  const engineVersion = getServerConfig().engineVersion;
  const snapshot = buildSnapshot();
  const baseParams: SimulateSpendParams = {
    userId: 'user-1',
    amountCents: 2_500,
    category: RewardCategory.DINING,
    surface: 'simulate',
  };

  const first = await simulateSpendAuthorityFromSnapshot(baseParams, {
    snapshot,
    nowMs: fixedNowMs,
    engineVersion,
    digest,
  });
  const second = await simulateSpendAuthorityFromSnapshot(baseParams, {
    snapshot,
    nowMs: fixedNowMs,
    engineVersion,
    digest,
  });

  assert.equal(first.inputsVersion, second.inputsVersion);
  assert.deepEqual(first, second);

  const severityFromReasons = first.reasons.reduce((acc, r) => Math.max(acc, r.severity), 0);
  assert.equal(first.severity, severityFromReasons);
  assert.ok(first.reasons.length >= 1);

  const changed = await simulateSpendAuthorityFromSnapshot(
    { ...baseParams, amountCents: baseParams.amountCents + 123 },
    { snapshot, nowMs: fixedNowMs, engineVersion, digest }
  );
  assert.notEqual(first.inputsVersion, changed.inputsVersion);

  for (const cf of first.counterfactuals) {
    const cfSeverity = cf.reasons.reduce((acc, r) => Math.max(acc, r.severity), 0);
    assert.equal(cf.severity, cfSeverity);
    assert.ok(cf.reasons.length >= 1);
  }

  const recorded: Array<Record<string, unknown>> = [];
  const writer: DecisionEventWriter = {
    create: async ({ data }: { data: Record<string, unknown> }) => {
      recorded.push(data);
      return data;
    },
  };

  const { __authorityPure: _authorityBrand, ...decision } = first;
  void _authorityBrand;
  await recordDecisionEventWithWriter({
    userId: baseParams.userId,
    surface: baseParams.surface,
    params: baseParams,
    decision: decision as SimulatedAuthorityDecision,
    writer,
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
    assert.ok(field in event, `Missing decisionEvent field ${field}`);
  }

  console.warn('authority invariants: ok');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
