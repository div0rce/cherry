import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const assert = require('node:assert/strict');
const { prisma } = require('../../lib/prisma');
const { verifyVineSignature, getVineSignatureMode } = require('../../lib/vine/security');

async function run() {
  await prisma.vineDevice.upsert({
    where: { deviceId: 'TEST-DEVICE-INACTIVE' },
    update: { secret: 's', isActive: false },
    create: { deviceId: 'TEST-DEVICE-INACTIVE', secret: 's', isActive: false, label: 'Inactive' },
  });
  const ctx = { deviceId: 'TEST-DEVICE-INACTIVE', amountCents: 100, currency: 'USD', timestamp: 1 };

  assert.deepStrictEqual(await verifyVineSignature(ctx, 'abc', 'enforce'), {
    ok: false,
    mode: 'enforce',
    reason: 'inactive_device',
  });
  assert.deepStrictEqual(await verifyVineSignature(ctx, 'abc', 'warn'), {
    ok: true,
    mode: 'warn',
    reason: 'inactive_device',
  });
  assert.deepStrictEqual(await verifyVineSignature({ ...ctx, deviceId: 'NOPE' }, 'abc', 'warn'), {
    ok: true,
    mode: 'warn',
    reason: 'unknown_device',
  });
  assert.deepStrictEqual(await verifyVineSignature(ctx, '', 'enforce'), {
    ok: false,
    mode: 'enforce',
    reason: 'missing_signature',
  });
  assert.deepStrictEqual(await verifyVineSignature(ctx, undefined, 'off'), { ok: true, mode: 'off' });
  assert.equal(getVineSignatureMode('warn'), 'warn');
  assert.equal(getVineSignatureMode('bogus'), getVineSignatureMode());
  console.warn('vine security branches: ok');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
