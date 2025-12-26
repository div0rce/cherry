/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');

const { runSimulation } = require('../lib/simulation-adapter');

async function testPassThrough() {
  const fakeDecision = { category: 'DINING', overallVerdict: 'GREEN' };
  const input = {
    userId: 'user-1',
    amountCents: 1234,
    category: 'DINING',
    merchantName: 'Test',
    mccCode: null,
    nowMs: new Date('2024-01-01T00:00:00Z').getTime(),
  };

  const result = await runSimulation(input, {
    runEngineFn: async (payload) => {
      assert.deepEqual(payload, input);
      return fakeDecision;
    },
  });

  assert.equal(result.decision, fakeDecision);
}

async function run() {
  await testPassThrough();
  console.warn('simulation adapter: ok');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
