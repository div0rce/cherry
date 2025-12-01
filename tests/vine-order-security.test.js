/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { prisma } = require('../lib/prisma');
const { callApi } = require('../lib/client/api');

function hmac(secret, message) {
  return crypto.createHmac('sha256', secret).update(message).digest('hex');
}

async function seedDevice() {
  return prisma.vineDevice.upsert({
    where: { deviceId: 'TEST-DEVICE-API' },
    update: { secret: 'api-secret-123', isActive: true, label: 'API Test Device' },
    create: {
      deviceId: 'TEST-DEVICE-API',
      secret: 'api-secret-123',
      isActive: true,
      label: 'API Test Device',
    },
  });
}

async function run() {
  const originalMode = process.env.CHERRY_VINE_SIGNATURE_MODE;
  await seedDevice();
  const ctx = {
    deviceId: 'TEST-DEVICE-API',
    amountCents: 1875,
    currency: 'USD',
    timestamp: Date.now(),
    storeId: 'STORE-API',
    terminalId: 'TERM-API',
    orderId: 'ORDER-API',
  };
  const message = [
    ctx.deviceId,
    ctx.amountCents,
    ctx.currency,
    ctx.timestamp,
    ctx.storeId,
    ctx.terminalId,
    ctx.orderId,
  ].join('|');
  const goodSig = hmac('api-secret-123', message);

  // Mode off: should allow missing signature
  process.env.CHERRY_VINE_SIGNATURE_MODE = 'off';
  let res = await callApi('/api/vine/order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...ctx, source: 'VINE_SIM' }),
  });
  assert.equal(res.ok, true);

  // Enforce with good signature
  process.env.CHERRY_VINE_SIGNATURE_MODE = 'enforce';
  res = await callApi('/api/vine/order', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Vine-Signature': goodSig,
    },
    body: JSON.stringify({ ...ctx, source: 'VINE_SIM' }),
  });
  assert.equal(res.ok, true, JSON.stringify(res.error));

  // Enforce missing signature
  res = await callApi('/api/vine/order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...ctx, source: 'VINE_SIM' }),
  });
  assert.equal(res.ok, false);
  assert.equal(res.status, 401);

  // Enforce wrong signature
  res = await callApi('/api/vine/order', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Vine-Signature': 'deadbeef',
    },
    body: JSON.stringify({ ...ctx, source: 'VINE_SIM' }),
  });
  assert.equal(res.ok, false);
  assert.equal(res.status, 401);

  process.env.CHERRY_VINE_SIGNATURE_MODE = originalMode;
  console.warn('vine order security: ok');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

