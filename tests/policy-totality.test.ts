import * as assert from 'node:assert/strict';
import {
  simulateSpendAuthorityFromSnapshot,
  type AuthoritySnapshot,
  type SimulateSpendParams,
} from '../lib/authority/simulateSpendAuthority.js';
import type { Digest } from '../lib/adapters/digest.js';
import { AUTHORITY_VERDICTS } from '../lib/policy/verdicts.js';

const digest: Digest = {
  sha256: () => 'a'.repeat(64),
};

const baseSnapshot: AuthoritySnapshot = {
  dailyState: {
    status: 'SAFE',
    safeToSpendCents: 15_000,
    inputsVersion: 'ds-hash',
  },
  buckets: [
    {
      id: 'bucket-1',
      category: 'DINING',
      budgetAmount: 20_000,
      remainingCents: 18_000,
      strictMode: true,
      periodEndMs: new Date('2024-02-01T00:00:00Z').getTime(),
    },
  ],
  categoryPreferenceMode: 'BUDGETED',
  pendingSessions: 0,
  pendingPoints: 0,
};

const baseParams: SimulateSpendParams = {
  userId: 'user-1',
  amountCents: 2_500,
  category: 'DINING',
  surface: 'simulate',
};

const verdicts = new Set(AUTHORITY_VERDICTS);

async function runCase(
  name: string,
  snapshot: AuthoritySnapshot,
  params: SimulateSpendParams
): Promise<void> {
  const decision = await simulateSpendAuthorityFromSnapshot(params, {
    snapshot,
    nowMs: new Date('2024-01-02T00:00:00Z').getTime(),
    engineVersion: 'test-engine',
    digest,
  });

  assert.ok(verdicts.has(decision.verdict), `${name}: verdict should be total`);
  for (const cf of decision.counterfactuals) {
    assert.ok(verdicts.has(cf.verdict), `${name}: counterfactual verdict should be total`);
  }
}

async function run(): Promise<void> {
  await runCase('base', baseSnapshot, baseParams);

  const riskySnapshot: AuthoritySnapshot = {
    ...baseSnapshot,
    dailyState: {
      status: 'RISKY',
      safeToSpendCents: 2_000,
      inputsVersion: 'ds-risky',
    },
    pendingSessions: 1,
    pendingPoints: 2,
  };
  await runCase('risky', riskySnapshot, { ...baseParams, amountCents: 7_500 });

  const restrictedSnapshot: AuthoritySnapshot = {
    ...baseSnapshot,
    categoryPreferenceMode: 'UNBUDGETED',
  };
  await runCase('restricted', restrictedSnapshot, baseParams);

  console.warn('policy-totality: ok');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
