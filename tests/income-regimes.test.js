/* eslint-disable @typescript-eslint/no-require-imports */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const assert = require('node:assert/strict');
const { buildMonthlyIncomeSnapshots, detectIncomeRegimesFromMonthly } = require('../lib/income/monthly');

function incomeTx(monthIndex, amountMinor) {
  const base = new Date(Date.UTC(2024, monthIndex, 1));
  return {
    id: `income-${monthIndex}`,
    userId: 'user-regime',
    amountMinor,
    direction: 'CREDIT',
    description: 'DIRECT DEP PAYROLL',
    rawDescription: 'DIRECT DEP PAYROLL',
    merchantName: null,
    merchantCity: null,
    merchantRegion: null,
    merchantCountry: null,
    mcc: null,
    postedAt: base,
    occurredAt: base,
    source: 'csv_dev',
    section: null,
    incomeKind: 'PAYROLL',
    p2pKind: 'NONE',
  };
}

async function run() {
  const txs = [
    ...Array.from({ length: 6 }).map((_, idx) => incomeTx(idx, 200_00)),
    ...Array.from({ length: 6 }).map((_, idx) => incomeTx(idx + 6, 800_00)),
  ];

  const monthly = buildMonthlyIncomeSnapshots(txs);
  const regimes = detectIncomeRegimesFromMonthly(monthly, { minMonthsPerRegime: 2, shiftThresholdRatio: 0.3 });

  assert.equal(regimes.length, 2);
  assert.ok(regimes[0].avgNetIncomeCents < regimes[1].avgNetIncomeCents);
  const totalMonths = regimes.reduce((acc, r) => acc + r.months.length, 0);
  assert.equal(totalMonths, monthly.length);
  assert.ok(regimes.every((r) => r.months.length >= 2));

  console.warn('income-regimes: ok');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
