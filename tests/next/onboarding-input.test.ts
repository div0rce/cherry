import * as assert from 'node:assert/strict';
import { buildCardPayload } from '../../app/(user)/app/onboarding/_lib/card-input.js';
import { buildRulePayload } from '../../app/(user)/app/onboarding/_lib/rule-input.js';

// Card: blank issuer/network fall back; fee parses to integer cents; negative fee is a field error.
assert.deepEqual(buildCardPayload({ nickname: 'Gold', issuer: '  ', network: '', cardType: 'credit', annualFee: '95.5' }), {
  ok: true,
  payload: { nickname: 'Gold', issuer: 'Custom issuer', network: 'OTHER', isCredit: true, annualFee: 9550 },
});
assert.deepEqual(buildCardPayload({ nickname: 'X', issuer: ' Chase ', network: 'visa', cardType: 'debit' }), {
  ok: true,
  payload: { nickname: 'X', issuer: 'Chase', network: 'VISA', isCredit: false, annualFee: null },
});
assert.deepEqual(buildCardPayload({ nickname: 'X', cardType: 'credit', annualFee: '-1' }), {
  ok: false,
  state: { status: 'error', message: 'Annual fee must be zero or greater.', fieldErrors: { annualFee: ['Annual fee must be zero or greater.'] } },
});

// Rule: base scope maps to OTHER; rate must be positive; unsupported category rejected.
assert.deepEqual(buildRulePayload({ scope: 'BASE', category: 'DINING', rateKind: 'points', rateValue: '2' }), {
  ok: true,
  payload: { category: 'OTHER', multiplier: 2, cashbackPercent: undefined },
});
assert.deepEqual(buildRulePayload({ scope: 'CATEGORY', category: 'GAS', rateKind: 'cashback', rateValue: '3' }), {
  ok: true,
  payload: { category: 'GAS', multiplier: undefined, cashbackPercent: 3 },
});
const zero = buildRulePayload({ scope: 'CATEGORY', category: 'GAS', rateKind: 'points', rateValue: '0' });
assert.equal(zero.ok, false);
const bad = buildRulePayload({ scope: 'CATEGORY', category: 'ENTERTAINMENT', rateKind: 'points', rateValue: '1' });
assert.deepEqual(bad, {
  ok: false,
  state: { status: 'error', message: 'Choose a supported category.', fieldErrors: { category: ['Choose a supported category.'] } },
});
process.stdout.write('onboarding-input: ok\n');
