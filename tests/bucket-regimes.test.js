/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const { synthesizeTemplatesForRegime, REGIME_BUCKET_KEYS } = require('../lib/buckets/regimes');

function spendTx(monthIndex, amountMinor, description, mcc) {
  const base = new Date(Date.UTC(2024, monthIndex, 5));
  return {
    id: `spend-${description}-${monthIndex}`,
    userId: 'user-buckets',
    amountMinor,
    direction: 'DEBIT',
    description,
    rawDescription: description,
    merchantName: description,
    merchantCity: null,
    merchantRegion: null,
    merchantCountry: null,
    mcc: mcc ?? null,
    postedAt: base,
    occurredAt: base,
    source: 'csv_dev',
    section: null,
    incomeKind: 'NONE',
    p2pKind: 'NONE',
  };
}

async function run() {
  const months = [new Date(Date.UTC(2024, 0, 1)), new Date(Date.UTC(2024, 1, 1)), new Date(Date.UTC(2024, 2, 1))];
  const regime = {
    startMonth: months[0],
    endMonth: months[2],
    months,
    avgNetIncomeCents: 200_000,
    avgFixedCostsCents: 50_000,
    avgFreeCashCents: 150_000,
    regimeLabel: 'Test Regime',
  };

  const txs = [
    spendTx(0, -30_00, 'GROCERY MART', 5411),
    spendTx(1, -40_00, 'GROCERY MART', 5411),
    spendTx(2, -50_00, 'GROCERY MART', 5411),
    spendTx(0, -25_00, 'UBER RIDE', 4121),
    spendTx(1, -25_00, 'UBER RIDE', 4121),
    spendTx(2, -25_00, 'UBER RIDE', 4121),
    spendTx(0, -60_00, 'DINING PLACE', 5812),
  ];

  const templates = synthesizeTemplatesForRegime(regime, txs);
  const totalLimit = templates.reduce((sum, t) => sum + t.monthlyLimitCents, 0);

  assert.ok(totalLimit <= Math.round(regime.avgNetIncomeCents * 1.2), 'total limits should be capped');
  const essentialsLimit =
    templates
      .filter((t) =>
        [
          REGIME_BUCKET_KEYS.ESSENTIALS_GROCERIES,
          REGIME_BUCKET_KEYS.ESSENTIALS_TRANSPORT,
          REGIME_BUCKET_KEYS.ESSENTIALS_PERSONAL_CARE,
        ].includes(t.bucketKey),
      )
      .reduce((sum, t) => sum + t.monthlyLimitCents, 0) ?? 0;
  const freeCash = regime.avgFreeCashCents;
  const essentialShare = essentialsLimit / freeCash;
  assert.ok(essentialShare >= 0.35 && essentialShare <= 0.65, 'essentials share should stay in a healthy band');

  console.warn('bucket-regimes: ok');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
