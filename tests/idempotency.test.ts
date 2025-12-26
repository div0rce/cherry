import assert from 'node:assert/strict';
import { withIdempotency } from '../lib/idempotency.js';
import { makeTestWorld } from './helpers/world.js';

type Payload = { value: number };

async function run(): Promise<void> {
  const { world } = makeTestWorld({ nowMs: 1710000000000 });
  let runs = 0;

  const runOnce = async (userId: string) =>
    withIdempotency<Payload>(
      world,
      'test:key',
      userId,
      async () => {
        runs += 1;
        return { value: runs };
      },
      (value) => ({ value: value.value }),
      (payload) => ({ value: Number(payload['value']) })
    );

  const result1 = await runOnce('user-1');
  const result2 = await runOnce('user-1');
  const result3 = await runOnce('user-2');

  assert.equal(runs, 2, 'idempotent runs should be isolated per user');
  assert.deepEqual(result1, result2, 'idempotent run should return cached payload');
  assert.notDeepEqual(result2, result3, 'different users should not collide on idempotency');

  const { world: errorWorld } = makeTestWorld({ nowMs: 1710000000000 });
  const erroringWorld = {
    ...errorWorld,
    stores: {
      ...errorWorld.stores,
      idempotency: {
        get: async () => null,
        put: async () => {
          const error = new Error('DB unavailable');
          (error as { code?: string }).code = 'P5000';
          throw error;
        },
      },
    },
  };
  let threw = false;
  try {
    await withIdempotency<Payload>(
      erroringWorld,
      'test:key',
      'user-1',
      async () => ({ value: 1 }),
      (value) => ({ value: value.value }),
      (payload) => ({ value: Number(payload['value']) })
    );
  } catch {
    threw = true;
  }
  assert.ok(threw, 'non-P2002 idempotency errors must be surfaced');
  console.warn('idempotency: ok');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
