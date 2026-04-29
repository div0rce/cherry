import * as assert from 'node:assert/strict';
import {
  REWARD_POINT_VALUE_CENTS,
  aggregateUtilitySamples,
  centsToUtilityCents,
  rewardPointsToUtilityCents,
  sumObjectiveUtility,
  utilityCents,
} from '../../lib/engine/objective/utility.js';
import { riskAdjustedUtility } from '../../lib/engine/objective/risk.js';

function testRewardPointsUseExplicitValueMapping(): void {
  assert.equal(rewardPointsToUtilityCents(1000), 1000);
  assert.equal(
    rewardPointsToUtilityCents(5000),
    5000 * REWARD_POINT_VALUE_CENTS
  );
}

function testCashCentsStayCanonical(): void {
  assert.equal(centsToUtilityCents(2500), 2500);
}

function testTotalUsesObjectiveComponentUtilityCents(): void {
  const total = sumObjectiveUtility([
    {
      key: 'cash',
      kind: 'cash_benefit',
      utilityCents: utilityCents(1000),
      interpretation: 'Cash benefit.',
    },
    {
      key: 'liquidity',
      kind: 'liquidity_pressure',
      utilityCents: utilityCents(-250),
      interpretation: 'Liquidity penalty.',
    },
  ]);

  assert.equal(total, 750);
}

function testUtilitySampleAggregation(): void {
  const aggregate = aggregateUtilitySamples([1, 2, 3]);

  assert.equal(aggregate.expectedUtility, 2);
  assert.equal(aggregate.variance, 2 / 3);
  assert.equal(aggregate.samples, 3);
}

function testRiskAdjustedUtility(): void {
  assert.equal(riskAdjustedUtility(10, 4, 0), 10);
  assert.equal(riskAdjustedUtility(10, 4, 0.5), 8);
}

testRewardPointsUseExplicitValueMapping();
testCashCentsStayCanonical();
testTotalUsesObjectiveComponentUtilityCents();
testUtilitySampleAggregation();
testRiskAdjustedUtility();

process.stdout.write('objective utility semantics: ok\n');
