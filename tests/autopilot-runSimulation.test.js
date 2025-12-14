import assert from 'node:assert/strict';
import Module from 'node:module';

const requireModule = Module.createRequire(__filename);

function resetModules() {
  try {
    const resolved = requireModule.resolve('../lib/autopilot/runSimulation');
    delete requireModule.cache[resolved];
  } catch {
    // ignore
  }
}

function buildUiStub() {
  const { getAutopilotUiSpec } = requireModule('@/lib/autopilot/uiSpec');
  const spec = getAutopilotUiSpec();
  return {
    badge: {
      tone: 'neutral',
      label: spec.panel.safetyLabel,
    },
    cardLabels: {
      recommended: 'Recommended',
      alternate: 'Alternate card',
      caution: 'Use caution',
      usualCardFallback: 'Your usual card',
    },
    rewardStrength: {
      label: 'Good rewards',
    },
    impact: {
      fallbackSegments: {
        usedLabel: 'Bucket used',
        remainingLabel: 'Bucket remaining',
        otherLabel: 'Everything else',
      },
      bucketUsedTemplate: '${bucketName} used',
      bucketRemainingTemplate: '${bucketName} remaining',
    },
    sections: {
      recommendation: 'Autopilot recommendation',
      alternatives: 'Other ways to pay',
      monthImpactTitle: 'Month impact',
    },
    ctas: {
      primaryTemplate: 'Use ${cardName} for this purchase',
      secondary: 'View bucket impact',
    },
    explanation: {
      primary: 'Use Alpha',
      secondary: ['Keeps budget steady'],
      warnings: [],
    },
    panel: {
      idleTitle: spec.panel.idleTitle,
      idleBody: spec.panel.idleBody,
      loadingTitle: spec.panel.loadingTitle,
      loadingBody: spec.panel.loadingBody,
      loadingShimmerLines: spec.panel.loadingShimmerLines,
      errorTitle: spec.panel.errorTitle,
      errorBody: spec.panel.errorBody,
      errorTimestampFallback: spec.panel.errorTimestampFallback,
      sectionSimulationEyebrow: spec.panel.sectionSimulationEyebrow,
      unnamedMerchantFallback: spec.panel.unnamedMerchantFallback,
      simulationIssueTitle: spec.panel.simulationIssueTitle,
      showingPreviousResultNote: spec.panel.showingPreviousResultNote,
      actionComingSoonNote: spec.panel.actionComingSoonNote,
      safetyLabel: spec.panel.safetyLabel,
    },
  };
}

async function runHappyPath() {
  resetModules();
  const calls = [];
  const originalFetch = global.fetch;
  global.fetch = async (input, init) => {
    calls.push({ input, init, body: init?.body ? JSON.parse(init.body) : null });
    const payload = {
      decisionId: 'decision-1',
      merchant: 'Test Shop',
      amountCents: 1_234,
      occurredAt: '2024-01-01T00:00:00.000Z',
      status: 'ok',
      recommendedCard: { id: 'card-1', label: 'Alpha', issuer: 'Issuer', network: 'VISA' },
      expectedBenefitCents: 120,
      bucketImpact: { bucketId: 'bucket-1', name: 'Dining', remainingCents: 7_000, spentCents: 13_000 },
      reasonCode: 'MAX_REWARDS',
      ui: buildUiStub(),
    };
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  const { runSimulation } =
    requireModule('../lib/autopilot/runSimulation');

  const result = await runSimulation({
    amount: 12.34,
    merchant: 'Test Shop',
    category: 'dining',
    timing: 'now',
  });

  const firstCall = calls[0];
  assert.equal(firstCall.body.amountCents, 1_234);
  assert.equal(firstCall.body.category, 'DINING');
  assert.equal(result.cards[0].name, 'Alpha');
  assert.equal(result.state, 'recommended');
  assert.equal(result.impactSegments.length, 3);
  assert.ok(result.rewardStrength >= 1 && result.rewardStrength <= 4);
  assert.ok(result.monthImpactSummary.length > 0);

  // clean up
  global.fetch = originalFetch;
}

async function runWarningMapping() {
  resetModules();
  const originalFetch = global.fetch;
  global.fetch = async () => {
    const payload = {
      decisionId: 'decision-2',
      merchant: 'Edge Shop',
      amountCents: 500,
      occurredAt: '2024-02-01T00:00:00.000Z',
      status: 'fallback',
      recommendedCard: null,
      expectedBenefitCents: 0,
      bucketImpact: { bucketId: 'bucket-2', name: 'Other', remainingCents: 0, spentCents: 500 },
      reasonCode: 'FALLBACK_SAFE',
      ui: {
        ...buildUiStub(),
        explanation: {
          primary: 'Fallback',
          secondary: [],
          warnings: ['Budget pressure detected'],
        },
      },
    };
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  const { runSimulation } =
    requireModule('../lib/autopilot/runSimulation');

  const result = await runSimulation({
    amount: 5,
    merchant: 'Edge Shop',
    category: 'other',
    timing: 'now',
  });

  assert.equal(result.state, 'warning');
  assert.ok(result.riskBanner);
  assert.equal(result.impactSegments.length, 3);

  global.fetch = originalFetch;
}

async function runAdapterHandlesError() {
  resetModules();
  const originalFetch = global.fetch;
  global.fetch = async () =>
    new Response(JSON.stringify({ error: 'Engine down', code: 'ENGINE_ERROR' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });

  const { runSimulation } =
    requireModule('../lib/autopilot/runSimulation');

  try {
    await runSimulation({
      amount: 10,
      merchant: 'Err Shop',
      category: 'other',
      timing: 'now',
    });
    assert.fail('expected runSimulation to throw');
  } catch (err) {
    const error = err;
    assert.equal(error.message, 'Engine down');
    assert.ok(error.errorTimestamp);
    assert.equal(error.code, 'ENGINE_ERROR');
  }

  global.fetch = originalFetch;
}

async function run() {
  await runHappyPath();
  await runWarningMapping();
  await runAdapterHandlesError();
  process.stdout.write('autopilot-runSimulation: ok\n');
}

run().catch((err) => {
  const message =
    err instanceof Error ? err.stack ?? err.message : typeof err === 'string' ? err : JSON.stringify(err);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
