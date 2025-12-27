import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const assert = require('node:assert/strict');
const { RewardCategory } = require('@prisma/client');
const { validateEngineDecision } = require('../lib/engine-invariants');

const baseDecision = {
  category: RewardCategory.DINING,
  amountCents: 0,
  budget: {
    verdict: 'UNCONFIGURED',
    coverageMode: 'UNCONFIGURED',
    hasBucket: false,
  },
  card: {
    verdict: 'NO_CARD_DATA',
    hasCardData: false,
  },
  overallVerdict: 'INSUFFICIENT_DATA',
  cherryIncentive: {
    pointsIfFollowed: 0,
    expiryMinutes: 0,
  },
};

function run() {
  // 0-amount snapshots should be valid and offer no points.
  const snapshotDecision = {
    ...baseDecision,
    amountCents: 0,
  };
  assert.doesNotThrow(() => validateEngineDecision(snapshotDecision));
  assert.equal(snapshotDecision.cherryIncentive.pointsIfFollowed, 0);

  // Incentives cannot be offered when we have no card data.
  const invalidDecision = {
    ...baseDecision,
    amountCents: 1000,
    cherryIncentive: { pointsIfFollowed: 5, expiryMinutes: 15 },
  };
  assert.throws(() => validateEngineDecision(invalidDecision));

  // Strict buckets cannot be overspent while marked healthy.
  const invalidBudgetDecision = {
    ...baseDecision,
    amountCents: 5000,
    budget: {
      verdict: 'HEALTHY',
      coverageMode: 'BUDGETED',
      hasBucket: true,
      bucketId: 'bucket-1',
      name: 'Dining Weekly',
      limitCents: 20000,
      spentBeforeCents: 19000,
      spentAfterCents: 24000,
      remainingAfterCents: -4000,
      strictMode: true,
      wouldExceed: true,
    },
    card: {
      verdict: 'OPTIMAL',
      hasCardData: true,
      cardId: 'card-1',
      cardNickname: 'Test Card',
      multiplier: 1,
      estimatedRewards: 50,
    },
    overallVerdict: 'RED',
    cherryIncentive: { pointsIfFollowed: 0, expiryMinutes: 15 },
  };
  assert.throws(() => validateEngineDecision(invalidBudgetDecision));
}

run();
console.log('engine invariants: ok');
