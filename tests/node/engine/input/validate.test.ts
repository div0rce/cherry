import * as assert from 'node:assert/strict';
import { validateEngineInput } from '../../../../lib/engine/input/validate.js';
import type { EngineInput } from '../../../../lib/engine/input/EngineInput.js';

const baseInput: EngineInput = {
  __version: 'engine_input_v1',
  request: {
    surface: 'unknown',
    amountCents: 0,
    merchantCategoryKey: null,
  },
  balances: {
    cash: {
      liquidCents: null,
    },
  },
  buckets: [],
  debts: [],
  debtCardLinks: [],
  cards: [],
  constraints: {
    hard: {
      maxCardUtilization: null,
    },
  },
  preferences: {
    profileId: 'BALANCED',
    customWeights: null,
  },
  solver: {
    maxCandidates: null,
    weightsOverride: null,
  },
};

const baseIssues = validateEngineInput(baseInput);
assert.equal(baseIssues.length, 0, `base input should be valid: ${JSON.stringify(baseIssues)}`);

const negativeAmount: EngineInput = {
  ...baseInput,
  request: {
    ...baseInput.request,
    amountCents: -1,
  },
};
const negativeIssues = validateEngineInput(negativeAmount);
assert.ok(
  negativeIssues.some((issue) => issue.field === 'request.amountCents'),
  'expected amountCents >= 0 issue'
);

const fractionalAmount: EngineInput = {
  ...baseInput,
  request: {
    ...baseInput.request,
    amountCents: 1.5,
  },
};
const fractionalIssues = validateEngineInput(fractionalAmount);
assert.ok(
  fractionalIssues.some((issue) => issue.field === 'request.amountCents'),
  'expected amountCents integer issue'
);

console.warn('engine-input/validate: ok');
