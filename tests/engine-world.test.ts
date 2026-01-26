import * as assert from 'node:assert/strict';
import { buildEngineContext } from '../lib/engine.js';
import { runEngine } from '../lib/engine/run.js';
import type { EngineState } from '../lib/engine/types';
import { makeTestWorld } from './helpers/world.js';

function buildStubState(): EngineState {
  return {
    userId: 'user-1',
    buckets: [],
    debts: [],
    constraints: {
      hard: {
        minEssentialCoverageDays: 0,
        maxCardUtilization: null,
      },
      soft: {
        avoidInterest: false,
        avoidNewDebt: false,
      },
    },
    world: { baseInterestRate: null, inflationEstimate: null },
    cash: { liquidCents: 10_000, nextPaycheckDateMs: null, nextPaycheckNetCents: null },
    preferences: { profileId: 'BALANCED' },
    cards: [
      {
        id: 'card-1',
        userId: 'user-1',
        issuer: 'Issuer',
        label: 'Test Card',
        network: 'VISA',
        productSlug: null,
        rewardRules: [
          {
            id: 'rule-1',
            cardId: 'card-1',
            categoryKey: 'DINING',
            rateType: 'POINTS_PER_DOLLAR',
            rateValue: 2,
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
}

async function run(): Promise<void> {
  const { world } = makeTestWorld({ nowMs: 1704067200000 });
  const ctx = buildEngineContext({
    surface: 'web',
    nowMs: new Date('2024-01-01T00:00:00Z').getTime(),
    merchantCategoryKey: 'DINING',
    amountCents: 1000,
  });
  const state = buildStubState();

  const first = await runEngine(world, {
    state,
    context: ctx,
    options: { includeLegacyDecision: false },
  });
  const second = await runEngine(world, {
    state,
    context: ctx,
    options: { includeLegacyDecision: false },
  });

  assert.deepEqual(first, second, 'engine output should be deterministic for the same world/input');
  console.warn('engine-world: ok');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
