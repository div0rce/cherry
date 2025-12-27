import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const assert = require('node:assert/strict');
const { mapTerminalEventToOrderContext } = require('../lib/vine/order-context');

// Basic sanity: mapping terminal payload to OrderContext keeps values and allows missing MCC.
function testMapTerminalEvent() {
  const now = new Date('2024-01-01T00:00:00Z').getTime();
  const ctx = mapTerminalEventToOrderContext(
    {
      amountCents: 1875,
      currency: 'USD',
      merchantName: 'Test Merchant',
      storeId: 'STORE-1',
      terminalId: 'TERM-1',
      mccCode: null,
      timestamp: now,
      deviceId: 'DEV-1',
      orderId: 'ORDER-1',
      nonce: 'abc123',
      source: 'VINE_SIM',
    },
    { fallbackTimestampMs: now }
  );

  assert.equal(ctx.amountCents, 1875);
  assert.equal(ctx.merchantName, 'Test Merchant');
  assert.equal(ctx.mccCode, null);
  assert.equal(ctx.deviceId, 'DEV-1');
  assert.equal(ctx.source, 'VINE_SIM');
  assert.equal(ctx.orderId, 'ORDER-1');
  assert.equal(ctx.nonce, 'abc123');
  assert.ok(ctx.timestamp <= now + 1); // floor and sanity check
}

testMapTerminalEvent();
console.log('vine order mapping: ok');
