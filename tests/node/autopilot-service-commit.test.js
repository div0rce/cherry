import * as assert from 'node:assert/strict';
import * as Module from 'node:module';
import { makeTestWorld } from './helpers/world.js';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const requireModule = Module.createRequire(__filename);

const DECISION_ID = 'edid_v1_commit_test';
const USER_ID = 'user-commit';
const now = new Date('2024-01-01T00:00:00.000Z');

function mockModule(target, exports) {
  const resolved = requireModule.resolve(target);
  requireModule.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports };
}

function resetModules() {
  for (const target of [
    '../../lib/autopilot/service',
    '../../lib/autopilot/engine-decision',
    '../../lib/autopilot/engineDecisionId',
    '../../lib/prisma',
    '../../lib/log',
    '../../lib/scan-helpers',
    '../../lib/buckets/ensure-fresh',
    '../../lib/sessions/confirm-service',
  ]) {
    try {
      delete requireModule.cache[requireModule.resolve(target)];
    } catch {
      // ignore
    }
  }
}

class FakeSessionConfirmError extends Error {
  constructor(message, status, code, detail) {
    super(message);
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

function freshBucket(overrides = {}) {
  return {
    id: 'bucket-1',
    userId: USER_ID,
    name: 'Groceries',
    period: 'MONTHLY',
    budgetAmount: 50000,
    spentCents: 1000,
    ...overrides,
  };
}

function setup({ decision = {}, existingTx = null, existingCommit = null, bucket = freshBucket(), confirmError = null } = {}) {
  resetModules();
  const calls = [];
  const fullDecision = {
    kind: 'OK',
    cardId: 'card-1',
    bucketDelta: { bucketId: 'bucket-1', newRemainingCents: 44000, newSpentCents: 6000 },
    expectedMonetaryBenefitCents: 100,
    expectedPointsDelta: null,
    userFacingMessage: 'Use card 1',
    reasonCode: 'OK',
    ...decision,
  };
  const tx = {
    simulatedTransaction: {
      findUnique: async (args) => {
        calls.push(['tx.simulatedTransaction.findUnique', args]);
        return existingTx;
      },
      create: async (args) => {
        calls.push(['tx.simulatedTransaction.create', args]);
        return { id: args.data.id };
      },
    },
  };
  mockModule('../../lib/log', {
    logInvariantViolation: (entry) => calls.push(['logInvariantViolation', entry.detail]),
  });
  mockModule('../../lib/scan-helpers', { resolveScanCategory: async () => 'GROCERIES' });
  mockModule('../../lib/autopilot/engine-decision', {
    getAutopilotDecisionForUserSwipe: async () => fullDecision,
  });
  mockModule('../../lib/autopilot/engineDecisionId', {
    buildAutopilotStateSnapshot: async () => ({}),
    buildAutopilotStateSnapshotHash: () => 'hash',
    computeEngineDecisionIdV1: () => DECISION_ID,
  });
  mockModule('../../lib/buckets/ensure-fresh', {
    ensureBucketFresh: async (bucketId, _at, db) => {
      calls.push(['ensureBucketFresh', bucketId, db === tx ? 'tx' : 'default']);
      return bucket;
    },
  });
  mockModule('../../lib/sessions/confirm-service', {
    SessionConfirmError: FakeSessionConfirmError,
    confirmRecommendationSession: async (args) => {
      calls.push(['confirmRecommendationSession', args.sessionId]);
      if (confirmError !== null) throw confirmError;
      await args.inTransaction({
        autopilotCommit: {
          create: async (createArgs) => calls.push(['tx.autopilotCommit.create', createArgs.data]),
        },
      });
    },
  });
  mockModule('../../lib/prisma', {
    prisma: {
      card: {
        findMany: async () => [
          { id: 'card-1', nickname: '', issuer: null, network: null, isCredit: true },
        ],
      },
      bucket: { findUnique: async () => ({ name: 'Groceries' }) },
      autopilotCommit: {
        findUnique: async (args) => {
          calls.push(['autopilotCommit.findUnique', args.where]);
          return existingCommit;
        },
      },
      recommendationSession: {
        upsert: async (args) => {
          calls.push(['recommendationSession.upsert', args]);
          return { id: 'session-1', recommendedBucketId: args.create.recommendedBucketId };
        },
      },
      $transaction: async (fn) => {
        calls.push(['$transaction']);
        return await fn(tx);
      },
    },
  });
  const service = requireModule('../../lib/autopilot/service');
  const { world } = makeTestWorld({ nowMs: now.getTime() });
  return { service, world, calls };
}

const baseInput = {
  decisionId: DECISION_ID,
  cardId: 'card-1',
  merchant: 'Shop',
  amountCents: 5000,
  category: 'GROCERIES',
};

async function expectCode(promise, code) {
  await assert.rejects(promise, (err) => {
    assert.equal(err.code, code);
    return true;
  });
}

async function testGuards(fnName) {
  let ctx = setup();
  await expectCode(
    ctx.service[fnName](ctx.world, USER_ID, { ...baseInput, decisionId: 'other' }, { now }),
    'DECISION_MISMATCH'
  );
  ctx = setup({ decision: { kind: 'BLOCKED' } });
  await expectCode(ctx.service[fnName](ctx.world, USER_ID, baseInput, { now }), 'DECISION_BLOCKED');
  ctx = setup({ decision: { cardId: null } });
  await expectCode(ctx.service[fnName](ctx.world, USER_ID, baseInput, { now }), 'CARD_MISMATCH');
  ctx = setup();
  await expectCode(
    ctx.service[fnName](ctx.world, USER_ID, { ...baseInput, cardId: 'card-2' }, { now }),
    'CARD_MISMATCH'
  );
}

async function testV1Created() {
  const { service, world, calls } = setup();
  const result = await service.commitAutopilotDecision(world, USER_ID, baseInput, { now });
  assert.equal(result.status, 'created');
  assert.equal(result.transactionId, DECISION_ID);
  assert.equal(result.bucket.id, 'bucket-1');
  assert.deepEqual(
    calls.map((c) => c[0]),
    ['$transaction', 'tx.simulatedTransaction.findUnique', 'ensureBucketFresh', 'tx.simulatedTransaction.create']
  );
  assert.equal(calls[2][2], 'tx');
  const data = calls[3][1].data;
  assert.equal(data.bucketId, 'bucket-1');
  assert.equal(data.bucketName, 'Groceries');
  assert.equal(data.bucketPeriod, 'MONTHLY');
  assert.equal(data.bucketBeforeCents, 49000);
  assert.equal(data.bucketAfterCents, 44000);
  assert.equal(data.bucketLimitCents, 50000);
  assert.equal(data.chosenCardId, 'card-1');
  assert.equal(data.chosenCardName, 'card-1');
  assert.equal(data.reason, 'AUTOPILOT_COMMIT');
}

async function testV1ForeignBucket() {
  const { service, world, calls } = setup({ bucket: freshBucket({ userId: 'someone-else' }) });
  const result = await service.commitAutopilotDecision(world, USER_ID, baseInput, { now });
  assert.equal(result.bucket, null);
  assert.ok(calls.some((c) => c[1] === 'Bucket delta referenced missing or foreign bucket'));
  const data = calls.find((c) => c[0] === 'tx.simulatedTransaction.create')[1].data;
  assert.equal(data.bucketId, 'bucket-1');
  assert.equal(data.bucketBeforeCents, null);
  assert.equal(data.bucketPeriod, null);
}

async function testV1NoBucketDelta() {
  const { service, world, calls } = setup({ decision: { bucketDelta: null } });
  const result = await service.commitAutopilotDecision(world, USER_ID, baseInput, { now });
  assert.equal(result.bucket, null);
  assert.ok(!calls.some((c) => c[0] === 'ensureBucketFresh'));
  const data = calls.find((c) => c[0] === 'tx.simulatedTransaction.create')[1].data;
  assert.equal(data.bucketId, null);
  assert.equal(data.bucketAfterCents, null);
}

async function testV1Existing() {
  const { service, world, calls } = setup({ existingTx: { id: DECISION_ID, bucketId: 'bucket-1' } });
  const result = await service.commitAutopilotDecision(world, USER_ID, baseInput, { now });
  assert.equal(result.status, 'already_exists');
  assert.equal(result.bucket.id, 'bucket-1');
  assert.ok(!calls.some((c) => c[0] === 'tx.simulatedTransaction.create'));
}

async function testV2Created() {
  const { service, world, calls } = setup();
  const result = await service.commitAutopilotDecisionV2(world, USER_ID, baseInput, { now });
  assert.deepEqual(result.status, 'created');
  assert.equal(result.sessionId, 'session-1');
  assert.equal(result.bucket.id, 'bucket-1');
  assert.deepEqual(
    calls.map((c) => c[0]),
    [
      'autopilotCommit.findUnique',
      'recommendationSession.upsert',
      'confirmRecommendationSession',
      'tx.autopilotCommit.create',
      'ensureBucketFresh',
    ]
  );
  const upsert = calls[1][1];
  assert.deepEqual(upsert.where, {
    userId_source_engineDecisionId: { userId: USER_ID, source: 'AUTOPILOT', engineDecisionId: DECISION_ID },
  });
  assert.equal(upsert.update.recommendedCardId, 'card-1');
  assert.equal(upsert.update.recommendedBucketId, 'bucket-1');
  assert.equal(upsert.update.budgetVerdict, 'HEALTHY');
  assert.equal(upsert.update.overallVerdict, 'GREEN');
  assert.equal(upsert.update.cardVerdict, 'OPTIMAL');
  assert.equal(upsert.create.verdict, 'HEALTHY');
  assert.equal(upsert.create.orderToken, DECISION_ID);
  assert.equal(upsert.create.expiresAt.getTime(), now.getTime() + 15 * 60 * 1000);
  assert.deepEqual(calls[3][1], { userId: USER_ID, decisionId: DECISION_ID, sessionId: 'session-1' });
}

async function testV2BreaksBudgetVerdicts() {
  const { service, world, calls } = setup({
    decision: { bucketDelta: { bucketId: 'bucket-1', newRemainingCents: 0, newSpentCents: 50000 } },
  });
  await service.commitAutopilotDecisionV2(world, USER_ID, baseInput, { now });
  const upsert = calls.find((c) => c[0] === 'recommendationSession.upsert')[1];
  assert.equal(upsert.create.verdict, 'BREAKS_BUDGET');
  assert.equal(upsert.update.overallVerdict, 'RED');
}

async function testV2Existing() {
  const { service, world, calls } = setup({
    existingCommit: { sessionId: 'session-old', session: { recommendedBucketId: 'bucket-1' } },
  });
  const result = await service.commitAutopilotDecisionV2(world, USER_ID, baseInput, { now });
  assert.equal(result.status, 'already_exists');
  assert.equal(result.sessionId, 'session-old');
  assert.equal(result.bucket.id, 'bucket-1');
  assert.ok(!calls.some((c) => c[0] === 'recommendationSession.upsert'));

  const noBucket = setup({ existingCommit: { sessionId: 'session-old', session: null } });
  const second = await noBucket.service.commitAutopilotDecisionV2(noBucket.world, USER_ID, baseInput, { now });
  assert.equal(second.bucket, null);
}

async function testV2ConfirmErrors() {
  let ctx = setup({ confirmError: new FakeSessionConfirmError('nope', 409, 'ALREADY_CLAIMED', undefined) });
  await assert.rejects(ctx.service.commitAutopilotDecisionV2(ctx.world, USER_ID, baseInput, { now }), (err) => {
    assert.equal(err.code, 'COMMIT_INVARIANT_VIOLATION');
    assert.equal(err.status, 409);
    assert.equal(err.message, 'nope');
    return true;
  });
  ctx = setup({ confirmError: new Error('boom') });
  await assert.rejects(ctx.service.commitAutopilotDecisionV2(ctx.world, USER_ID, baseInput, { now }), /boom/);
}

async function run() {
  await testGuards('commitAutopilotDecision');
  await testGuards('commitAutopilotDecisionV2');
  await testV1Created();
  await testV1ForeignBucket();
  await testV1NoBucketDelta();
  await testV1Existing();
  await testV2Created();
  await testV2BreaksBudgetVerdicts();
  await testV2Existing();
  await testV2ConfirmErrors();
  process.stdout.write('autopilot-service-commit: ok\n');
}

run().catch((err) => {
  const message =
    err instanceof Error ? err.stack ?? err.message : typeof err === 'string' ? err : JSON.stringify(err);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
