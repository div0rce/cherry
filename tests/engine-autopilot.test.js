import * as assert from 'node:assert/strict';
import * as Module from 'node:module';
import { makeTestWorld } from './helpers/world';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const requireModule = Module.createRequire(__filename);
const fixedNowMs = new Date('2024-01-01T00:00:00Z').getTime();
const { world } = makeTestWorld({ nowMs: fixedNowMs });

function mockModule(modulePath, exports) {
  const resolved = requireModule.resolve(modulePath);
  requireModule.cache[resolved] = {
    id: resolved,
    filename: resolved,
    loaded: true,
    exports,
  };
}

function resetModules() {
  const targets = [
    '../lib/engine/public',
    '../lib/engine/context',
    '../lib/engine/run',
    '../lib/engine/solver',
    '../lib/engine-state',
    '../lib/scan-helpers',
  ];
  for (const target of targets) {
    try {
      const resolved = requireModule.resolve(target);
      delete requireModule.cache[resolved];
    } catch {
      // ignore missing
    }
  }
}

function buildEngineState(overrides = {}) {
  return {
    userId: 'user-1',
    buckets: [
      {
        id: 'bucket-1',
        name: 'Dining',
        categoryKey: 'DINING',
        limitCents: 10_000,
        postedSpendCents: 2_000,
        pendingSpendCents: 0,
        committedCents: 2_000,
        remainingCents: 8_000,
        period: 'MONTHLY',
        isEssential: false,
        strictMode: false,
      },
    ],
    debts: [],
    constraints: {
      hard: { minEssentialCoverageDays: 0, maxCardUtilization: null },
      soft: { avoidInterest: false, avoidNewDebt: false },
    },
    world: { baseInterestRate: null, inflationEstimate: null },
    cash: { liquidCents: null, nextPaycheckDateMs: null, nextPaycheckNetCents: null },
    preferences: { profileId: 'BALANCED' },
    cards: [
      {
        id: 'card-a',
        userId: 'user-1',
        issuer: 'Test Bank',
        productSlug: null,
        label: 'Alpha Card',
        last4: '1111',
        network: 'VISA',
        isCredit: true,
        isActive: true,
        isVirtual: false,
        rewardRules: [
          {
            id: 'rule-a',
            cardId: 'card-a',
            categoryKey: 'DINING',
            mccPattern: null,
            rateType: 'CASHBACK',
            rateValue: 0.02,
            capAmountCents: null,
            capPeriod: null,
            promoStartMs: null,
            promoEndMs: null,
            source: 'STATIC_CONFIG',
            confidence: 1,
          },
        ],
        creditLimitCents: null,
        currentBalanceCents: null,
      },
      {
        id: 'card-b',
        userId: 'user-1',
        issuer: 'Test Bank',
        productSlug: null,
        label: 'Beta Card',
        last4: '2222',
        network: 'VISA',
        isCredit: true,
        isActive: true,
        isVirtual: false,
        rewardRules: [
          {
            id: 'rule-b',
            cardId: 'card-b',
            categoryKey: 'DINING',
            mccPattern: null,
            rateType: 'CASHBACK',
            rateValue: 0.01,
            capAmountCents: null,
            capPeriod: null,
            promoStartMs: null,
            promoEndMs: null,
            source: 'STATIC_CONFIG',
            confidence: 1,
          },
        ],
        creditLimitCents: null,
        currentBalanceCents: null,
      },
    ],
    ...overrides,
  };
}

function buildDecision({ cardId, score, committedAfter, remainingAfter }) {
  return {
    actionId: `use_card:${cardId}`,
    action: { type: 'USE_CARD', cardId },
    score,
    reasons: [],
    projections: {
      buckets: [
        {
          bucketId: 'bucket-1',
          projectedPostedSpendCents: committedAfter,
          projectedPendingSpendCents: 0,
          projectedCommittedCents: committedAfter,
          projectedRemainingCents: remainingAfter,
          projectedOverLimit: false,
        },
      ],
      debt: [],
      cash: { projectedLiquidCents: null, projectedOverdraftRisk: null },
    },
    constraintsBreached: [],
  };
}

function setupMocks({ state, engineResult, category = 'DINING' }) {
  mockModule('../lib/scan-helpers', {
    resolveScanCategory: async () => category,
  });
  mockModule('../lib/engine/context', {
    buildEngineContext: (ctx) => ctx,
  });
  mockModule('../lib/engine-state', {
    fromPrismaUserToEngineState: async () => state,
  });
  mockModule('../lib/engine/solver', {
    safeSolveDecisionForUser: async () => engineResult,
  });
}

async function runOkDecision() {
  const state = buildEngineState();
  const engineResult = {
    ok: true,
    decisions: [buildDecision({ cardId: 'card-a', score: 12, committedAfter: 3_000, remainingAfter: 7_000 })],
    trace: {
      engineVersion: 'test',
      weights: { rewards: 1, runway: 1, debtRelief: 1, volatility: 1, ruleViolations: 1 },
      stateSummary: { bucketCount: 1, cardCount: 2, debtCount: 0 },
      contextSummary: { surface: 'web', merchantCategoryKey: 'DINING', amountCents: 4_000 },
      candidates: [],
    },
    state,
  };

  resetModules();
  setupMocks({ state, engineResult });
  const { getAutopilotDecisionForUserSwipe } =
    requireModule('../lib/engine/public');

  const result = await getAutopilotDecisionForUserSwipe(world, {
    userId: 'user-1',
    merchant: 'Test Cafe',
    amountCents: 4_000,
    cardUniverseIds: ['card-a', 'card-b'],
    nowMs: fixedNowMs,
  });

  assert.equal(result.kind, 'OK');
  assert.equal(result.cardId, 'card-a');
  assert.ok(result.expectedMonetaryBenefitCents >= 0);
  assert.ok(result.userFacingMessage.length > 0);
  assert.ok(result.bucketDelta);
  assert.equal(result.bucketDelta.bucketId, 'bucket-1');
}

async function runBlockedDecision() {
  const state = buildEngineState();
  const engineResult = {
    ok: true,
    decisions: [],
    trace: {
      engineVersion: 'test',
      weights: { rewards: 1, runway: 1, debtRelief: 1, volatility: 1, ruleViolations: 1 },
      stateSummary: { bucketCount: 1, cardCount: 2, debtCount: 0 },
      contextSummary: { surface: 'web', merchantCategoryKey: 'DINING', amountCents: 5_000 },
      candidates: [],
    },
    state,
  };

  resetModules();
  setupMocks({ state, engineResult });
  const { getAutopilotDecisionForUserSwipe } =
    requireModule('../lib/engine/public');

  const result = await getAutopilotDecisionForUserSwipe(world, {
    userId: 'user-1',
    merchant: 'Guardrail Shop',
    amountCents: 5_000,
    cardUniverseIds: ['card-a'],
    nowMs: fixedNowMs,
  });

  assert.equal(result.kind, 'BLOCKED');
  assert.equal(result.cardId, null);
  assert.equal(result.bucketDelta, null);
}

async function runFallbackDecision() {
  const state = buildEngineState();
  const engineResult = {
    ok: true,
    decisions: [buildDecision({ cardId: 'card-a', score: 5, committedAfter: 2_500, remainingAfter: 7_500 })],
    trace: {
      engineVersion: 'test',
      weights: { rewards: 1, runway: 1, debtRelief: 1, volatility: 1, ruleViolations: 1 },
      stateSummary: { bucketCount: 1, cardCount: 2, debtCount: 0 },
      contextSummary: { surface: 'web', merchantCategoryKey: 'DINING', amountCents: 1_000 },
      candidates: [],
    },
    state,
  };

  resetModules();
  setupMocks({ state, engineResult });
  const { getAutopilotDecisionForUserSwipe } =
    requireModule('../lib/engine/public');

  const result = await getAutopilotDecisionForUserSwipe(world, {
    userId: 'user-1',
    merchant: 'Fallback Mart',
    amountCents: 1_000,
    cardUniverseIds: [],
    nowMs: fixedNowMs,
  });

  assert.equal(result.kind, 'FALLBACK');
  assert.equal(result.cardId, null);
  assert.equal(result.expectedMonetaryBenefitCents, 0);
}

async function run() {
  await runOkDecision();
  await runBlockedDecision();
  await runFallbackDecision();
  process.stdout.write('engine-autopilot: ok\n');
}

run().catch((err) => {
  const message =
    err instanceof Error ? err.stack ?? err.message : typeof err === 'string' ? err : JSON.stringify(err);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
