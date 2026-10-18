import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const assert = require('node:assert/strict');
const { setPrismaClient } = require('../../lib/prisma');
const { resolveCategory, runEngine } = require('../../lib/adapters/runtime/legacy-engine.prisma');

const state = { mcc: null, buckets: [], pref: null, cards: [] };
setPrismaClient({
  bucket: { findMany: async () => state.buckets },
  card: { findMany: async () => state.cards },
  rewardRule: {},
  categoryPreference: { findUnique: async () => state.pref },
  mccToRewardCategory: { findFirst: async () => state.mcc },
  dailyState: {},
  recommendationSession: {},
  cherryPointLedger: {},
  decisionEvent: {},
});

async function checkResolveCategory() {
  state.mcc = { category: 'GAS' };
  assert.equal(await resolveCategory({ mccCode: 5541, category: 'dining' }), 'GAS');
  assert.equal(await resolveCategory({ mccCode: 1.5, category: ' dining ' }), 'DINING');
  state.mcc = null;
  assert.equal(
    await resolveCategory({ mccCode: 5541, category: 'nope', merchantName: 'Joe Pizza' }),
    'DINING'
  );
  assert.equal(await resolveCategory({ category: '', merchantName: 'Hilton Hotel' }), 'HOTEL');
  assert.equal(await resolveCategory({ merchantName: 'Netflix' }), 'ENTERTAINMENT');
  assert.equal(await resolveCategory({ merchantName: 'Uber' }), 'TRAVEL');
  assert.equal(await resolveCategory({ merchantName: 'Airport' }), 'AIR_TRAVEL');
  assert.equal(await resolveCategory({ merchantName: 'Supermarket' }), 'GROCERIES');
  assert.equal(await resolveCategory({ merchantName: 'Exxon' }), 'GAS');
  assert.equal(await resolveCategory({}), 'OTHER');
}

async function checkRunEngine() {
  await assert.rejects(
    runEngine({ userId: 'u', amountCents: -1, nowMs: 0 }),
    /amountCents must be a non-negative integer/
  );
  await assert.rejects(
    runEngine({ userId: 'u', amountCents: NaN, nowMs: 0 }),
    /amountCents must be a non-negative integer/
  );
  await assert.rejects(runEngine({ userId: 'u', amountCents: 1 }), /runEngine requires explicit `nowMs`/);

  const nowMs = Date.UTC(2024, 0, 15);
  const base = { userId: 'u', category: 'DINING', nowMs };

  let res = await runEngine({ ...base, amountCents: 1000 });
  assert.deepStrictEqual(res.budget, {
    verdict: 'UNCONFIGURED',
    coverageMode: 'UNCONFIGURED',
    hasBucket: false,
  });
  assert.deepStrictEqual(res.card, { verdict: 'NO_CARD_DATA', hasCardData: false });
  assert.equal(res.overallVerdict, 'UNKNOWN');

  state.pref = { mode: 'UNBUDGETED' };
  res = await runEngine({ ...base, amountCents: 1000 });
  assert.equal(res.budget.coverageMode, 'UNBUDGETED_INTENTIONAL');
  state.pref = null;

  state.cards = [
    { id: 'b', nickname: 'B', rewardRules: [{ category: 'DINING', multiplier: 3 }] },
    { id: 'a', nickname: 'A', rewardRules: [{ category: 'OTHER', multiplier: 3 }] },
    { id: 'c', nickname: 'C', rewardRules: [{ category: 'DINING', multiplier: null }] },
  ];
  state.buckets = [
    {
      id: 'bk',
      name: 'Food',
      userId: 'u',
      category: 'DINING',
      budgetAmount: 10000,
      spentCents: 8000,
      strictMode: false,
      createdAt: new Date(nowMs),
    },
  ];
  const verdicts = [];
  for (const amountCents of [500, 1500, 2500]) {
    res = await runEngine({ ...base, amountCents });
    verdicts.push([
      res.budget.verdict,
      res.budget.remainingAfterCents,
      res.budget.wouldExceed,
      res.overallVerdict,
      res.cherryIncentive.pointsIfFollowed,
    ]);
  }
  assert.deepStrictEqual(verdicts, [
    ['HEALTHY', 1500, false, 'GREEN', 0],
    ['BORDERLINE', 500, false, 'YELLOW', 1],
    ['BREAKS_BUDGET', -500, true, 'RED', 0],
  ]);
  assert.equal(res.card.cardId, 'a');
  assert.equal(res.card.rewardRate, 3);
  assert.equal(res.card.rewardPoints, 75);

  state.cards = [{ id: 'z', nickname: 'Z', rewardRules: [{ category: 'DINING', multiplier: 0 }] }];
  res = await runEngine({ ...base, amountCents: 100 });
  assert.deepStrictEqual(res.card, { verdict: 'NO_CARD_DATA', hasCardData: false });
}

async function run() {
  await checkResolveCategory();
  await checkRunEngine();
  console.warn('legacy engine prisma: ok');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
