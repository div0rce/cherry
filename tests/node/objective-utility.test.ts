import * as assert from 'node:assert/strict';
import {
  REWARD_POINT_VALUE_CENTS,
  centsToUtilityCents,
  rewardPointsToUtilityCents,
  sumObjectiveUtility,
  utilityCents,
} from '../../lib/engine/objective/utility.js';

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

testRewardPointsUseExplicitValueMapping();
testCashCentsStayCanonical();
testTotalUsesObjectiveComponentUtilityCents();

process.stdout.write('objective utility semantics: ok\n');
