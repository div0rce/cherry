import * as assert from 'node:assert/strict';
import * as Module from 'node:module';
import { fileURLToPath } from 'node:url';

// confirmRecommendationSession: the claim is re-checked inside the transaction (a concurrent
// confirm loses with SESSION_ALREADY_CLAIMED instead of a raw constraint error), bucket spend is an
// atomic increment (no lost update), and inTransaction writes run in the same transaction.

const __filename = fileURLToPath(import.meta.url);
const requireModule = Module.createRequire(__filename);

function stub(specifier: string, exports: Record<string, unknown>): void {
  const resolved = requireModule.resolve(specifier);
  requireModule.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports } as NodeModule;
}

const NOW = new Date(Date.UTC(2026, 9, 17, 12, 0, 0));
type Call = { op: string; args: unknown };
let calls: Call[] = [];
let claimCount = 1;

const tx = {
  recommendationSession: {
    updateMany: async (args: unknown) => {
      calls.push({ op: 'session.updateMany', args });
      return { count: claimCount };
    },
  },
  bucket: {
    updateMany: async (args: unknown) => {
      calls.push({ op: 'bucket.updateMany', args });
      return { count: 1 };
    },
  },
  cherryPointLedger: {
    create: async (args: unknown) => {
      calls.push({ op: 'ledger.create', args });
      return {};
    },
  },
};

stub('../../lib/prisma', {
  prisma: {
    recommendationSession: {
      findFirst: async () => ({
        id: 'session-1',
        userId: 'user-1',
        status: 'RECOMMENDED',
        confirmedAmountCents: null,
        overallVerdict: 'HEALTHY',
        cherryPointsOffered: 5,
        amountCents: 1000,
        recommendedCardId: 'card-1',
        recommendedBucketId: 'bucket-1',
        expiresAt: new Date(NOW.getTime() + 60_000),
        createdAt: NOW,
      }),
      updateMany: async () => ({ count: 1 }),
    },
    $transaction: async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx),
  },
});
stub('../../lib/buckets/ensure-fresh', {
  ensureBucketFresh: async () => ({ id: 'bucket-1', userId: 'user-1', spentCents: 200 }),
});
stub('../../lib/verification/verify-session', { autoVerifySession: async () => undefined });
stub('../../lib/user-context', { logInvariant: () => undefined });

const { confirmRecommendationSession } = requireModule('../../lib/sessions/confirm-service.ts') as {
  confirmRecommendationSession: (params: Record<string, unknown>) => Promise<{ kind: string }>;
};

const params = (extra: Record<string, unknown> = {}): Record<string, unknown> => ({
  sessionId: 'session-1',
  userId: 'user-1',
  payload: { actualAmountCents: 1000, usedCardId: 'card-1', followedRecommendation: true },
  now: NOW,
  ...extra,
});

async function run(): Promise<void> {
  // Happy path: guarded claim, atomic increment, inTransaction after the ledger write, same tx.
  let seenTx: unknown = null;
  const result = await confirmRecommendationSession(
    params({
      inTransaction: async (client: unknown) => {
        seenTx = client;
        calls.push({ op: 'inTransaction', args: null });
      },
    })
  );
  assert.equal(result.kind, 'confirmed');
  assert.deepEqual(
    calls.map((c) => c.op),
    ['session.updateMany', 'bucket.updateMany', 'ledger.create', 'inTransaction']
  );
  const claimWhere = (calls[0]?.args as { where: Record<string, unknown> }).where;
  assert.deepEqual(claimWhere, {
    id: 'session-1',
    userId: 'user-1',
    status: 'RECOMMENDED',
    confirmedAmountCents: null,
  });
  assert.deepEqual((calls[1]?.args as { data: unknown }).data, { spentCents: { increment: 1000 } });
  assert.equal(seenTx, tx);

  // A concurrent confirm claimed it first: clean error, nothing else written.
  calls = [];
  claimCount = 0;
  await assert.rejects(
    confirmRecommendationSession(params({ inTransaction: async () => calls.push({ op: 'inTransaction', args: null }) })),
    (error: unknown) => (error as { code?: string }).code === 'SESSION_ALREADY_CLAIMED'
  );
  assert.deepEqual(calls.map((c) => c.op), ['session.updateMany']);
  claimCount = 1;

  // A failing inTransaction write propagates out of the transaction (so the claim rolls back).
  const boom = new Error('commit row failed');
  await assert.rejects(
    confirmRecommendationSession(
      params({
        inTransaction: async () => {
          throw boom;
        },
      })
    ),
    (error: unknown) => error === boom
  );

  process.stdout.write('session-confirm-atomic: ok\n');
}

void run();
