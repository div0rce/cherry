/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const { classifyTransactionsInMemory } = require('../lib/income/classifier');

function tx(overrides = {}) {
  return {
    id: `tx-${Math.random()}`,
    userId: 'user-classifier',
    amountMinor: overrides.amountMinor ?? 5000,
    direction: overrides.direction ?? 'CREDIT',
    description: overrides.description ?? 'DIRECT DEP PAYROLL',
    rawDescription: overrides.rawDescription ?? overrides.description ?? null,
    merchantName: overrides.merchantName ?? null,
    merchantCity: null,
    merchantRegion: null,
    merchantCountry: null,
    mcc: overrides.mcc ?? null,
    postedAt: overrides.postedAt ?? new Date('2024-01-01T00:00:00Z'),
    occurredAt: overrides.occurredAt ?? new Date('2024-01-01T00:00:00Z'),
    source: 'csv_dev',
    section: null,
    incomeKind: 'NONE',
    p2pKind: 'NONE',
  };
}

async function run() {
  const payroll = tx({ description: 'DIRECT DEP COMPANY PAYROLL' });
  const refund = tx({ description: 'REFUND MERCHANT', amountMinor: 3200 });
  const zelleAllowanceBase = new Date('2024-02-01T00:00:00Z');
  const p2pAllowance = [
    tx({ description: 'ZELLE MOM', postedAt: zelleAllowanceBase }),
    tx({ description: 'ZELLE MOM', postedAt: new Date(zelleAllowanceBase.getTime() + 7 * 24 * 60 * 60 * 1000) }),
    tx({ description: 'ZELLE MOM', postedAt: new Date(zelleAllowanceBase.getTime() + 14 * 24 * 60 * 60 * 1000) }),
  ];
  const venmoRepay = tx({ description: 'VENMO UBER SPLIT', direction: 'DEBIT', amountMinor: -2200 });
  const pseudoMerchant = [
    tx({ description: 'VENMO BARBER', direction: 'DEBIT', amountMinor: -3000, postedAt: new Date('2024-03-01') }),
    tx({ description: 'VENMO BARBER', direction: 'DEBIT', amountMinor: -3000, postedAt: new Date('2024-04-01') }),
    tx({ description: 'VENMO BARBER', direction: 'DEBIT', amountMinor: -3100, postedAt: new Date('2024-05-01') }),
  ];

  const results = classifyTransactionsInMemory([payroll, refund, ...p2pAllowance, venmoRepay, ...pseudoMerchant]);
  const byId = new Map(results.map((r) => [r.txId, r]));

  assert.equal(byId.get(payroll.id).incomeKind, 'PAYROLL');
  assert.equal(byId.get(refund.id).incomeKind, 'REFUND');
  for (const txItem of p2pAllowance) {
    assert.equal(byId.get(txItem.id).p2pKind, 'P2P_ALLOWANCE');
    assert.equal(byId.get(txItem.id).incomeKind, 'ALLOWANCE');
  }
  assert.equal(byId.get(venmoRepay.id).p2pKind, 'P2P_REPAYMENT_OUT');
  for (const txItem of pseudoMerchant) {
    assert.equal(byId.get(txItem.id).p2pKind, 'P2P_PSEUDO_MERCHANT_OUT');
  }

  console.warn('income-classifier: ok');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
