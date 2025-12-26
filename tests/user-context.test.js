/* eslint-disable @typescript-eslint/no-require-imports */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const assert = require('node:assert/strict');

const { resolveUserContext } = require('../lib/user-context');
const { assertUserId } = require('../lib/invariants');
const { getServerConfig, resetServerConfigForTests } = require('../lib/config/store');

async function testAuthenticatedMode() {
  const ctx = await resolveUserContext({
    requireAuth: true,
    allowLabDemo: true,
    sessionOverride: { user: { id: 'user-auth-1', email: 'auth@example.com' } },
    getSession: async () => ({ user: { id: 'user-auth-1', email: 'auth@example.com' } }),
  });
  assert.equal(ctx.userId, 'user-auth-1');
  assert.equal(ctx.mode, 'AUTHENTICATED');
  assert.equal(ctx.email, 'auth@example.com');
}

async function testLabModeInDev() {
  const currentConfig = getServerConfig();
  resetServerConfigForTests({ ...currentConfig, environment: 'development' });

  let created = 0;
  const labUserFactory = async () => {
    created += 1;
    return { id: 'lab-user-1', email: 'lab@example.com' };
  };

  const first = await resolveUserContext({
    requireAuth: false,
    allowLabDemo: true,
    sessionOverride: null,
    getSession: async () => null,
    labUserFactory,
  });
  const second = await resolveUserContext({
    requireAuth: false,
    allowLabDemo: true,
    sessionOverride: null,
    getSession: async () => null,
    labUserFactory,
  });

  assert.equal(first.mode, 'LAB_DEMO');
  assert.equal(first.userId, 'lab-user-1');
  assert.equal(second.userId, 'lab-user-1');
  assert.ok(created >= 1);

  resetServerConfigForTests(currentConfig);
}

async function testLabModeDeniedInProd() {
  const currentConfig = getServerConfig();
  resetServerConfigForTests({ ...currentConfig, environment: 'production' });
  let threw = false;
  try {
    await resolveUserContext({
      requireAuth: false,
      allowLabDemo: true,
      sessionOverride: null,
      getSession: async () => null,
      labUserFactory: async () => ({ id: 'lab-prod' }),
    });
  } catch (err) {
    threw = true;
    assert.match(String(err), /lab demo mode is disabled in production/);
  }
  assert.equal(threw, true);
  resetServerConfigForTests(currentConfig);
}

function testAssertUserId() {
  assert.throws(() => assertUserId(null));
  assert.doesNotThrow(() => assertUserId('real-user'));
}

async function run() {
  await testAuthenticatedMode();
  await testLabModeInDev();
  await testLabModeDeniedInProd();
  testAssertUserId();
  console.warn('user-context: ok');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
