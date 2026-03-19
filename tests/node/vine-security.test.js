import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { prisma } = require('../../lib/prisma');
const { assertServerConfig } = require('../../lib/config/server');
const {
  buildVineSignatureMessage,
  verifyVineSignature,
  getVineSignatureMode,
} = require('../../lib/vine/security');
const { getServerConfig, resetServerConfigForTests } = require('../../lib/config/store');

function hmac(secret, message) {
  return crypto.createHmac('sha256', secret).update(message).digest('hex');
}

function setSignatureMode(mode) {
  const current = getServerConfig();
  resetServerConfigForTests({ ...current, vineSignatureMode: mode });
}

async function seedDevice() {
  return prisma.vineDevice.upsert({
    where: { deviceId: 'TEST-DEVICE-1' },
    update: { secret: 'test-secret-123', isActive: true },
    create: {
      deviceId: 'TEST-DEVICE-1',
      secret: 'test-secret-123',
      isActive: true,
      label: 'Test Device',
    },
  });
}

async function run() {
  const originalMode = process.env.CHERRY_VINE_SIGNATURE_MODE;
  const current = getServerConfig();
  const device = await seedDevice();
  const ctx = {
    deviceId: device.deviceId,
    amountCents: 1875,
    currency: 'USD',
    timestamp: 1732765200000,
    storeId: 'STORE-1',
    terminalId: 'TERM-1',
    orderId: 'ORDER-1',
  };

  const message = buildVineSignatureMessage(ctx);
  assert.equal(
    message,
    'TEST-DEVICE-1|1875|USD|1732765200000|STORE-1|TERM-1|ORDER-1'
  );
  const goodSig = hmac(device.secret, message);

  process.env.CHERRY_VINE_SIGNATURE_MODE = 'off';
  setSignatureMode('off');
  const offResult = await verifyVineSignature(ctx, null);
  assert.equal(offResult.ok, true);
  assert.equal(getVineSignatureMode(), 'off');

  process.env.CHERRY_VINE_SIGNATURE_MODE = 'warn';
  setSignatureMode('warn');
  const warnMissing = await verifyVineSignature(ctx, null);
  assert.equal(warnMissing.ok, true);
  assert.equal(warnMissing.reason, 'missing_signature');
  const warnMismatch = await verifyVineSignature(ctx, 'deadbeef');
  assert.equal(warnMismatch.ok, true);
  assert.equal(warnMismatch.reason, 'signature_mismatch');

  process.env.CHERRY_VINE_SIGNATURE_MODE = 'enforce';
  setSignatureMode('enforce');
  const enforceGood = await verifyVineSignature(ctx, goodSig);
  assert.equal(enforceGood.ok, true);
  const enforceMissing = await verifyVineSignature(ctx, null);
  assert.equal(enforceMissing.ok, false);
  assert.equal(enforceMissing.reason, 'missing_signature');
  const enforceBad = await verifyVineSignature(ctx, 'deadbeef');
  assert.equal(enforceBad.ok, false);
  assert.equal(enforceBad.reason, 'signature_mismatch');

  // unknown device
  const unknownCtx = { ...ctx, deviceId: 'UNKNOWN' };
  const unknownRes = await verifyVineSignature(unknownCtx, goodSig);
  assert.equal(unknownRes.ok, false);
  assert.equal(unknownRes.reason, 'unknown_device');

  assert.throws(
    () => assertServerConfig({ ...current, environment: 'production', vineSignatureMode: 'off' }),
    /Invalid Vine configuration: production requires enforce mode/
  );
  assert.throws(
    () => assertServerConfig({ ...current, environment: 'production', vineSignatureMode: 'warn' }),
    /Invalid Vine configuration: production requires enforce mode/
  );
  assert.doesNotThrow(() =>
    assertServerConfig({ ...current, environment: 'production', vineSignatureMode: 'enforce' })
  );
  assert.doesNotThrow(() =>
    assertServerConfig({ ...current, environment: 'development', vineSignatureMode: 'off' })
  );
  assert.doesNotThrow(() =>
    assertServerConfig({ ...current, environment: 'test', vineSignatureMode: 'warn' })
  );

  setSignatureMode(originalMode ?? 'off');
  process.env.CHERRY_VINE_SIGNATURE_MODE = originalMode;
  console.warn('vine security: ok');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
