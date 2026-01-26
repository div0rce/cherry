import * as assert from 'node:assert/strict';
import * as Module from 'node:module';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const requireModule = Module.createRequire(__filename);

const authorityStub = {
  version: 'authority_v1',
  verdict: 'ALLOW_SIMULATED',
  severity: 0,
  reasons: [{ code: 'DAILY_STATE_RISKY', severity: 0, detail: 'ok' }],
  explanation: 'ok',
  inputsVersion: 'hash',
  engineVersion: 'test',
  counterfactuals: [],
};

function resetModules() {
  try {
    const resolved = requireModule.resolve('../../lib/autopilot/runSimulation');
    delete requireModule.cache[resolved];
  } catch {
    // ignore
  }
}

function buildUiStub() {
  const { getAutopilotUiSpec } = requireModule('../../lib/autopilot/uiSpec');
  const spec = getAutopilotUiSpec();
  return {
    badge: {
      severity: 'neutral',
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
    level: 3,
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
    formLabels: {
      category: {
        dining: 'Dining',
        groceries: 'Groceries',
        travel: 'Travel',
        gas: 'Gas',
        other: 'Other',
      },
      timing: {
        now: 'Now',
        'scheduled-soon': 'Scheduling soon',
      },
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
      authority: authorityStub,
      ui: buildUiStub(),
    };
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  const { runSimulation } =
    requireModule('../../lib/autopilot/runSimulation');

  const result = await runSimulation(
    {
      amount: 12.34,
      merchant: 'Test Shop',
      category: 'dining',
      timing: 'now',
    },
    { now: new Date('2024-01-01T00:00:00Z') }
  );

  const firstCall = calls[0];
  assert.equal(firstCall.body.amountCents, 1_234);
  assert.equal(firstCall.body.category, 'DINING');
  assert.equal(result.cards[0].name, 'Alpha');
  assert.equal(result.state, 'recommended');
  assert.equal(result.categoryLabel, 'Dining');
  assert.equal(result.timingLabel, 'Now');
  assert.equal(result.impactSegments.length, 3);
  assert.equal(result.rewardStrength, 3);
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
      authority: authorityStub,
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
    requireModule('../../lib/autopilot/runSimulation');

  const result = await runSimulation(
    {
      amount: 5,
      merchant: 'Edge Shop',
      category: 'other',
      timing: 'now',
    },
    { now: new Date('2024-02-01T00:00:00Z') }
  );

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
    requireModule('../../lib/autopilot/runSimulation');

  try {
    await runSimulation(
      {
        amount: 10,
        merchant: 'Err Shop',
        category: 'other',
        timing: 'now',
      },
      { now: new Date('2024-03-01T00:00:00Z') }
    );
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
