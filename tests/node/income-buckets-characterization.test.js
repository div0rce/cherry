import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Characterization test: pins exact outputs of income classification, monthly regimes
// and bucket template synthesis so structural refactors stay behavior-preserving.
const require = createRequire(import.meta.url);
const assert = require('node:assert/strict');
const { setPrismaClient } = require('../../lib/prisma');
const {
  classifyTransactionsInMemory,
  classifyIncomeAndP2PForUser,
  getNetEarnedIncomeCents,
  isRefundLike,
} = require('../../lib/income/classifier');
const {
  buildMonthlyIncomeSnapshots,
  detectIncomeRegimesFromMonthly,
  computeIncomeRegimesForUser,
} = require('../../lib/income/monthly');
const {
  inferBucketKeyForTransaction,
  synthesizeTemplatesForRegime,
  synthesizeBucketTemplatesForUser,
  deriveBucketDeltaCents,
} = require('../../lib/buckets/regimes');

const DAY = 24 * 60 * 60 * 1000;
let seq = 0;

function tx(overrides = {}) {
  seq += 1;
  const postedAt = overrides.postedAt === undefined ? new Date('2024-01-05T00:00:00Z') : overrides.postedAt;
  return {
    id: `tx-${seq}`,
    userId: 'user-char',
    amountMinor: 5000,
    direction: 'CREDIT',
    description: null,
    rawDescription: null,
    merchantName: null,
    merchantCity: null,
    merchantRegion: null,
    merchantCountry: null,
    mcc: null,
    occurredAt: postedAt,
    source: 'csv_dev',
    section: null,
    incomeKind: 'NONE',
    p2pKind: 'NONE',
    ...overrides,
    postedAt,
  };
}

function daysFrom(iso, days) {
  return new Date(new Date(iso).getTime() + days * DAY);
}

function classifierCases() {
  const credits = [
    tx({ description: 'DIRECT DEP ACME' }),
    tx({ rawDescription: 'STIPEND JAN' }),
    tx({ description: 'REFUND STORE' }),
    tx({ description: 'XFER FROM SAVINGS' }),
    tx({ description: 'ETSY PAYOUT' }),
    tx({ description: 'MYSTERY CREDIT' }),
    tx({ description: 'PAYROLL', incomeKind: 'SIDE_GIG' }),
    tx({ description: 'ZELLE BOB HAIR', merchantName: 'BOB-A' }),
    tx({ description: 'VENMO LUNCH', merchantName: 'CAROL' }),
    tx({ description: 'PAYPAL FROM DAD', merchantName: 'DAN' }),
  ];
  const debits = [
    tx({ direction: 'DEBIT', description: 'VENMO REIMBURSE', amountMinor: -1200, merchantName: 'EVE' }),
    tx({ direction: 'DEBIT', description: 'VENMO PIZZA', amountMinor: -1200, merchantName: 'FRANK' }),
    tx({ direction: 'DEBIT', description: 'CASHAPP TUTOR', amountMinor: -4000, merchantName: 'GIA' }),
    tx({ direction: 'DEBIT', description: 'PAYROLL', amountMinor: -10, p2pKind: 'P2P_REPAYMENT_IN' }),
    tx({ direction: null, description: 'ZELLE X' }),
  ];
  const allowanceSeries = [0, 7, 14].map((d) =>
    tx({ description: 'ZELLE AUNT', merchantName: 'AUNT', postedAt: daysFrom('2024-02-01T00:00:00Z', d) }),
  );
  const pseudoInSeries = [0, 30, 60].map((d) =>
    tx({ description: 'VENMO JOB', merchantName: 'CLIENT', amountMinor: 9000, postedAt: daysFrom('2024-02-01T00:00:00Z', d) }),
  );
  const pseudoOutSeries = [0, 30, 61].map((d) =>
    tx({
      direction: 'DEBIT',
      description: 'ZELLE LANDLORD',
      merchantName: 'LL',
      amountMinor: -90000,
      postedAt: daysFrom('2024-02-01T00:00:00Z', d),
    }),
  );
  return [...credits, ...debits, ...allowanceSeries, ...pseudoInSeries, ...pseudoOutSeries];
}

function bucketKeyCases() {
  const mccs = [5411, 5422, 5441, 5451, 5541, 5542, 4111, 4121, 5812, 5813, 5814, 7230, 7298, 9999];
  const byMcc = mccs.map((mcc) => tx({ direction: 'DEBIT', description: 'GENERIC', mcc }));
  const byDesc = ['SAFEWAY 12', 'SHELL OIL', 'NAIL SPA', 'CAFE LATTE', 'BEST BUY', 'TRADER JOES'].map((d) =>
    tx({ direction: 'DEBIT', description: d }),
  );
  const fallbacks = [
    tx({ direction: 'DEBIT', rawDescription: 'COFFEE BAR' }),
    tx({ direction: 'DEBIT', merchantName: 'LYFT' }),
    tx({ direction: 'DEBIT', description: 'MARKET', mcc: 5812 }),
  ];
  const p2p = [
    tx({ direction: 'DEBIT', description: 'BARBER', p2pKind: 'P2P_REPAYMENT_OUT', mcc: 5411 }),
    tx({ direction: 'DEBIT', description: 'ZELLE BARBER', p2pKind: 'P2P_PSEUDO_MERCHANT_OUT' }),
    tx({ direction: 'DEBIT', description: 'ZELLE RENT', p2pKind: 'P2P_PSEUDO_MERCHANT_OUT' }),
    tx({ direction: 'DEBIT', description: 'ZELLE LESSON', p2pKind: 'P2P_PSEUDO_MERCHANT_OUT', mcc: 5411 }),
  ];
  return [...byMcc, ...byDesc, ...fallbacks, ...p2p];
}

function monthlyCases() {
  const kinds = ['PAYROLL', 'ALLOWANCE', 'SIDE_GIG', 'REFUND', 'INTERNAL_TRANSFER', 'OTHER', 'NONE'];
  const txs = kinds.map((incomeKind, idx) => tx({ incomeKind, amountMinor: (idx + 1) * 1000 }));
  txs.push(tx({ incomeKind: 'OTHER', p2pKind: 'P2P_ALLOWANCE', amountMinor: -777 }));
  txs.push(tx({ incomeKind: 'PAYROLL', amountMinor: Number.NaN }));
  txs.push(tx({ incomeKind: 'PAYROLL', postedAt: null, occurredAt: new Date('2024-03-09T00:00:00Z') }));
  txs.push(tx({ incomeKind: 'PAYROLL', postedAt: null, occurredAt: null }));
  txs.push(tx({ direction: 'DEBIT', incomeKind: 'PAYROLL' }));
  return txs;
}

function snapshot(monthIncomes) {
  return monthIncomes.map((cents, idx) => ({
    monthStart: new Date(Date.UTC(2024, idx, 1)),
    totalCreditsCents: cents,
    payrollCents: cents,
    allowanceCents: 0,
    sideGigCents: 0,
    refundCents: 0,
    internalTransferCents: 0,
    otherCents: 0,
    netEarnedIncomeCents: cents,
  }));
}

function regimeFixture(overrides = {}) {
  const months = [0, 1, 2].map((m) => new Date(Date.UTC(2024, m, 1)));
  return {
    startMonth: months[0],
    endMonth: months[2],
    months,
    avgNetIncomeCents: 200_000,
    avgFixedCostsCents: 50_000,
    avgFreeCashCents: 150_000,
    regimeLabel: 'R',
    ...overrides,
  };
}

function spendCases() {
  return [
    tx({ direction: 'DEBIT', amountMinor: -3000, description: 'GROCERY', postedAt: new Date('2024-01-03T00:00:00Z') }),
    tx({ direction: 'DEBIT', amountMinor: -4000, description: 'GROCERY', postedAt: new Date('2024-02-03T00:00:00Z') }),
    tx({ direction: 'DEBIT', amountMinor: -2500, description: 'UBER', postedAt: new Date('2024-02-03T00:00:00Z') }),
    tx({ direction: 'DEBIT', amountMinor: -6000, description: 'DINER', postedAt: new Date('2024-03-03T00:00:00Z') }),
    tx({ direction: 'DEBIT', amountMinor: -12345, description: 'GADGETS', postedAt: null, occurredAt: null }),
    tx({ direction: 'CREDIT', amountMinor: 1000, description: 'GADGETS', incomeKind: 'REFUND', postedAt: new Date('2024-03-04T00:00:00Z') }),
    tx({ direction: 'CREDIT', amountMinor: 999, description: 'GADGETS', postedAt: new Date('2024-03-04T00:00:00Z') }),
    tx({ direction: 'DEBIT', amountMinor: -500, description: 'GROCERY', postedAt: new Date('2025-01-03T00:00:00Z') }),
  ];
}

function recurringCases() {
  const monthlyRent = [0, 1, 2].map((m) =>
    tx({ direction: 'DEBIT', amountMinor: -150000, merchantName: 'Rent  Co', postedAt: new Date(Date.UTC(2024, m, 1)) }),
  );
  const weeklyGym = [0, 7, 14, 21].map((d) =>
    tx({ direction: 'DEBIT', amountMinor: -2000, description: 'GYM', postedAt: daysFrom('2024-04-01T00:00:00Z', d) }),
  );
  const noisy = [0, 30].map((d, i) =>
    tx({ direction: 'DEBIT', amountMinor: i === 0 ? -2000 : -9000, description: 'NOISY', postedAt: daysFrom('2024-01-02T00:00:00Z', d) }),
  );
  const small = [0, 30].map((d) => tx({ direction: 'DEBIT', amountMinor: -1000, description: 'TINY', postedAt: daysFrom('2024-01-02T00:00:00Z', d) }));
  const repay = [0, 30].map((d) =>
    tx({ direction: 'DEBIT', amountMinor: -5000, description: 'VENMO DINNER', p2pKind: 'P2P_REPAYMENT_OUT', postedAt: daysFrom('2024-01-02T00:00:00Z', d) }),
  );
  const pay = [0, 1, 2, 3, 4, 5].map((m) =>
    tx({ description: 'PAYROLL', amountMinor: m < 3 ? 400000 : 900000, postedAt: new Date(Date.UTC(2024, m, 1)) }),
  );
  return [...monthlyRent, ...weeklyGym, ...noisy, ...small, ...repay, ...pay];
}

function fakePrisma(rows, log) {
  return {
    bankTransaction: {
      findMany: async () => rows,
      update: (args) => ({ op: 'update', args }),
    },
    historicalBucketTemplate: {
      deleteMany: async (args) => log.push({ op: 'deleteMany', args }),
      create: (args) => ({ op: 'create', args }),
    },
    $transaction: async (ops) => {
      log.push({ op: '$transaction', ops });
      return ops;
    },
  };
}

async function collect() {
  seq = 0;
  const out = {};
  out.classify = classifyTransactionsInMemory(classifierCases());
  out.netEarned = [
    getNetEarnedIncomeCents('PAYROLL', 'NONE', -123.9),
    getNetEarnedIncomeCents('ALLOWANCE', 'NONE', 50),
    getNetEarnedIncomeCents('SIDE_GIG', 'NONE', Number.POSITIVE_INFINITY),
    getNetEarnedIncomeCents('OTHER', 'P2P_ALLOWANCE', 70),
    getNetEarnedIncomeCents('REFUND', 'NONE', 80),
  ];
  out.refundLike = [isRefundLike('REFUND', 'NONE'), isRefundLike('NONE', 'P2P_REPAYMENT_IN'), isRefundLike('OTHER', 'NONE')];

  out.bucketKeys = bucketKeyCases().map((t) => inferBucketKeyForTransaction(t));
  out.deltas = spendCases().map((t) => deriveBucketDeltaCents(t));

  out.monthly = buildMonthlyIncomeSnapshots(monthlyCases());
  out.regimesDefault = detectIncomeRegimesFromMonthly(snapshot([1000, 1000, 1000, 5000, 5000, 5000, 1000]));
  out.regimesMergeTail = detectIncomeRegimesFromMonthly(snapshot([1000, 1000, 1000, 9000, 9000, 9000]), {
    minMonthsPerRegime: 4,
  });
  out.regimesWindow1 = detectIncomeRegimesFromMonthly(snapshot([0, 0, 8000, 8000, 100, 100, 100]), {
    rollingWindow: 1,
    shiftThresholdRatio: 0.5,
    minMonthsPerRegime: 1,
  });
  out.regimesZeroMin = detectIncomeRegimesFromMonthly(snapshot([1000, 9000, 1000]), {
    rollingWindow: 1,
    minMonthsPerRegime: 0,
  });
  out.regimesEmpty = detectIncomeRegimesFromMonthly([]);

  out.templates = synthesizeTemplatesForRegime(regimeFixture(), spendCases());
  out.templatesEmpty = synthesizeTemplatesForRegime(regimeFixture({ avgNetIncomeCents: 0, avgFreeCashCents: 0, avgFixedCostsCents: 0 }), []);
  out.templatesOverCap = synthesizeTemplatesForRegime(
    regimeFixture({ avgNetIncomeCents: 10_000, avgFreeCashCents: 90_000, avgFixedCostsCents: 9_000 }),
    spendCases(),
  );
  out.templatesNoStart = synthesizeTemplatesForRegime(
    regimeFixture({ startMonth: null, months: [new Date(Date.UTC(2024, 1, 1))] }),
    spendCases(),
  );
  try {
    synthesizeTemplatesForRegime(regimeFixture({ startMonth: null, endMonth: null, months: [] }), spendCases());
    out.missingFallback = 'no-throw';
  } catch (err) {
    out.missingFallback = err.message;
  }

  const recurring = recurringCases();
  setPrismaClient(fakePrisma(recurring, []));
  const computed = await computeIncomeRegimesForUser('user-char');
  out.computedRegimes = computed.regimes;
  out.computedKinds = computed.transactions.map((t) => [t.id, t.incomeKind, t.p2pKind]);

  const persistLog = [];
  setPrismaClient(fakePrisma(classifierCases(), persistLog));
  const origWarn = console.warn;
  const warnings = [];
  console.warn = (msg) => warnings.push(msg);
  try {
    await classifyIncomeAndP2PForUser('user-char', { persist: true, sourceFilter: ['csv_dev'] });
  } finally {
    console.warn = origWarn;
  }
  out.persist = { log: persistLog, warnings };

  const templateLog = [];
  setPrismaClient(fakePrisma(spendCases(), templateLog));
  const saved = [
    { id: 'reg-1', userId: 'user-char', ...regimeFixture({ months: undefined, endMonth: new Date(Date.UTC(2024, 2, 15)) }) },
  ];
  out.userTemplates = await synthesizeBucketTemplatesForUser('user-char', saved);
  out.userTemplateLog = templateLog;
  return JSON.parse(JSON.stringify(out));
}

const goldenPath = fileURLToPath(new URL('../fixtures/income-buckets-characterization.golden.json', import.meta.url));

async function run() {
  const actual = await collect();
  if (process.env.CHERRY_WRITE_GOLDEN === '1') {
    process.stdout.write(JSON.stringify(actual, null, 2));
    return;
  }
  const expected = JSON.parse(readFileSync(goldenPath, 'utf8'));
  assert.deepEqual(actual, expected);
  console.warn('income-buckets-characterization: ok');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
