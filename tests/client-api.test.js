/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');

global.fetch = async () => ({
  ok: true,
  status: 200,
  json: async () => ({ foo: 'bar' }),
});

const { callApi } = require('../lib/client/api');

async function run() {
  // Success path
  const success = await callApi('/api/test');
  assert.equal(success.ok, true);
  assert.deepEqual(success.data, { foo: 'bar' });

  // Failure path
  global.fetch = async () => ({
    ok: false,
    status: 500,
    json: async () => ({ error: 'boom' }),
  });
  const failure = await callApi('/api/test');
  assert.equal(failure.ok, false);
  assert.equal(failure.error, 'boom');

  console.warn('client api: ok');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
