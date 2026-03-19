import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const assert = require('node:assert/strict');
const {
  available,
  solveDecision,
  buildEngineContext,
  mapSolverDecisionToLegacyDecision,
  createLoadedEngineCapabilities,
} = require('../lib/engine');

async function testUsesRemainingNotLimit() {
  const state = {
    userId: 'user-remaining',
    buckets: [
      {
        id: 'bucket-1',
        name: 'Dining Bucket',
        categoryKey: 'DINING',
        limitCents: 10_000,
        postedSpendCents: 7_500,
        pendingSpendCents: 0,
        committedCents: 7_500,
        remainingCents: 2_500,
        period: 'MONTHLY',
        isEssential: false,
        strictMode: false,
      },
    ],
    debts: available([]),
    constraints: {
      hard: { minEssentialCoverageDays: 0, maxCardUtilization: null },
      soft: { avoidInterest: false, avoidNewDebt: false },
    },
    world: { baseInterestRate: null, inflationEstimate: null },
    cash: available({ liquidCents: null, nextPaycheckDateMs: null, nextPaycheckNetCents: null }),
    capabilities: createLoadedEngineCapabilities(),
    preferences: { profileId: 'BALANCED' },
    cards: [
      {
        id: 'card-1',
        userId: 'user-remaining',
        issuer: 'Issuer',
        label: 'Rewards Card',
        network: 'VISA',
        productSlug: null,
        last4: null,
        creditLimitCents: null,
        currentBalanceCents: null,
        rewardRules: [
          {
            id: 'rule-1',
            cardId: 'card-1',
            categoryKey: 'DINING',
            rateType: 'POINTS_PER_DOLLAR',
            rateValue: 1,
            confidence: 1,
            source: 'STATIC_CONFIG',
          },
        ],
        isCredit: true,
        isActive: true,
        isVirtual: false,
      },
    ],
  };

  const ctx = buildEngineContext({
    surface: 'web',
    nowMs: new Date('2024-01-01T00:00:00Z').getTime(),
    merchantCategoryKey: 'DINING',
    amountCents: 5_000,
  });

  const result = await solveDecision(state, ctx, { includeLegacyDecision: false });
  // TEMP debug to understand actual action types in case mapping fails
  // console.warn(
  //   'engine-bucket-remaining decisions:',
  //   JSON.stringify(result.decisions.map((d) => d.action.type), null, 2)
  // );
  const decision = result.decisions.find(
    (d) => d.action.type === 'USE_CARD' || d.action.type === 'USE_CARD_WITH_PAYDOWN'
  );
  assert.ok(decision, 'expected a card decision to map');

  const mapped = mapSolverDecisionToLegacyDecision({
    solverDecision: decision,
    state,
    ctx,
    category: 'DINING',
  });

  assert.ok(mapped, 'expected mapped legacy decision');
  assert.equal(mapped.budget.wouldExceed, true);
  assert.equal(mapped.budget.spentBeforeCents, 7_500);
  assert.equal(mapped.budget.spentAfterCents, 12_500);
}

async function run() {
  await testUsesRemainingNotLimit();
  console.warn('engine bucket remaining: ok');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
