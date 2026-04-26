import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const assert = require('node:assert/strict');
const {
  createScanFailureUiState,
  createScanSubmitStartUiState,
  resolveScanResponseUiState,
} = require('../lib/scan-client-state');

function makeSuccessResponse() {
  return {
    merchantName: 'Cafe',
    category: 'DINING',
    amountCents: 1200,
    bucket: null,
    cardRecommendation: {
      verdict: 'OPTIMAL',
      cardId: 'card-1',
      cardNickname: 'Debit Card',
      hasCardData: true,
      rewardUnit: 'cashback_cents',
      rewardRate: 0.01,
      rewardPoints: null,
      rewardValueCents: 12,
    },
    cherryIncentive: {
      pointsIfFollowed: 5,
      expiryMinutes: 15,
    },
    decision: {
      category: 'DINING',
      amountCents: 1200,
      budget: {
        verdict: 'HEALTHY',
        coverageMode: 'UNCONFIGURED',
        hasBucket: false,
        strictMode: false,
        wouldExceed: false,
      },
      card: {
        verdict: 'OPTIMAL',
        cardId: 'card-1',
        cardNickname: 'Debit Card',
        hasCardData: true,
      },
      overallVerdict: 'GREEN',
      cherryIncentive: { pointsIfFollowed: 5, expiryMinutes: 15 },
    },
    capabilities: {},
    degraded: {
      essentialProtection: false,
      debtPressure: false,
      liquidity: false,
      utilization: false,
    },
    degradation: null,
    authority: null,
  };
}

function makeFallbackResponse() {
  return {
    error: {
      code: 'CREDIT_ACTIONS_EXCLUDED_UNRESOLVABLE_CREDIT_LIABILITY',
      message:
        'Credit recommendations were excluded because the credit liability could not be fully resolved.',
    },
    decision: null,
    capabilities: {},
    degraded: {
      essentialProtection: false,
      debtPressure: true,
      liquidity: false,
      utilization: false,
    },
    degradation: {
      code: 'CREDIT_ACTIONS_EXCLUDED_UNRESOLVABLE_CREDIT_LIABILITY',
      message:
        'Credit recommendations were excluded because the credit liability could not be fully resolved.',
    },
    authority: null,
  };
}

function run() {
  const submitStart = createScanSubmitStartUiState();
  assert.deepEqual(submitStart, { scanPreview: null, error: null });

  const priorPreview = { merchantName: 'Old Cafe' };
  const fallback = resolveScanResponseUiState(makeFallbackResponse(), priorPreview);
  assert.deepEqual(fallback, {
    scanPreview: null,
    error: 'Credit recommendations were excluded because the credit liability could not be fully resolved.',
  });

  const failure = createScanFailureUiState('Failed to run scan');
  assert.deepEqual(failure, {
    scanPreview: null,
    error: 'Failed to run scan',
  });

  const nextPreview = { merchantName: 'Cafe' };
  const success = resolveScanResponseUiState(makeSuccessResponse(), nextPreview);
  assert.deepEqual(success, {
    scanPreview: nextPreview,
    error: null,
  });

  console.warn('scan-client-state: ok');
}

run();
