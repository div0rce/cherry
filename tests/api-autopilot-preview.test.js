import assert from 'node:assert/strict';
import Module from 'node:module';

const requireModule = Module.createRequire(__filename);

function mockModule(modulePath, exports) {
  requireModule.cache[modulePath] = {
    id: modulePath,
    filename: modulePath,
    loaded: true,
    exports,
  };
}

function mockNextServer() {
  class MockResponse extends Response {
    static json(body, init = {}) {
      return new Response(JSON.stringify(body), {
        status: init.status ?? 200,
        headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
      });
    }
  }
  const exports = {
    NextResponse: MockResponse,
    NextRequest: class extends Request {},
  };
  const resolved = requireModule.resolve('next/server');
  mockModule(resolved, exports);
  const withoutJs = resolved.replace(/\.js$/, '');
  mockModule(withoutJs, exports);
  try {
    const alt = requireModule.resolve('next/server.js');
    mockModule(alt, exports);
  } catch {
    // ignore
  }
}

function resetModules() {
  const targets = [
    '../app/api/autopilot/preview/route',
    'next/server',
    '@/lib/log',
    '@/lib/autopilot/service',
    '@/lib/user-context',
    '@/lib/metrics/autopilot',
    '@/lib/autopilot/uiSpec',
  ];
  for (const target of targets) {
    try {
      const resolved = requireModule.resolve(target);
      delete requireModule.cache[resolved];
    } catch {
      // ignore missing entries
    }
  }
}

function buildUiStub() {
  const { getAutopilotUiSpec } = requireModule('@/lib/autopilot/uiSpec');
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
      secondary: [],
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

async function runPreviewValid() {
  resetModules();
  mockNextServer();
  const logEvents = [];
  mockModule(requireModule.resolve('@/lib/log'), {
    logGuardrailEvent: (event) => logEvents.push(event),
    logInvariantViolation: () => {},
  });
  mockModule(requireModule.resolve('@/lib/metrics/autopilot'), {
    incrementCounter: () => {},
    observeDuration: () => {},
  });
  mockModule(requireModule.resolve('@/lib/autopilot/service'), {
    getAutopilotPreview: async () => ({
      decisionId: 'decision-1',
      merchant: 'Test Shop',
      amountCents: 5_000,
      occurredAt: '2024-01-01T00:00:00.000Z',
      status: 'ok',
      recommendedCard: { id: 'card-1', label: 'Alpha', issuer: 'Issuer', network: 'VISA' },
      expectedBenefitCents: 100,
      bucketImpact: null,
      reasonCode: 'MAX_REWARDS',
      ui: buildUiStub(),
    }),
  });
  mockModule(requireModule.resolve('@/lib/user-context'), {
    resolveUserContext: async () => ({ userId: 'user-1', mode: 'AUTHENTICATED', email: null }),
  });
  const { POST } =
    requireModule('../app/api/autopilot/preview/route');

  const res = await POST({
    json: async () => ({ merchant: 'Test Shop', amountCents: 5_000, category: 'DINING' }),
  });
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.decisionId, 'decision-1');
  assert.equal(body.recommendedCard.id, 'card-1');
  assert.ok(!('explanation' in body));
  assert.equal(logEvents.length, 0);
}

async function runPreviewInvalid() {
  resetModules();
  mockNextServer();
  const logEvents = [];
  mockModule(requireModule.resolve('@/lib/log'), {
    logGuardrailEvent: (event) => logEvents.push(event),
    logInvariantViolation: () => {},
  });
  mockModule(requireModule.resolve('@/lib/metrics/autopilot'), {
    incrementCounter: () => {},
    observeDuration: () => {},
  });
  mockModule(requireModule.resolve('@/lib/autopilot/service'), {
    getAutopilotPreview: async () => ({
      decisionId: 'decision-1',
      merchant: 'Test Shop',
      amountCents: 5_000,
      occurredAt: '2024-01-01T00:00:00.000Z',
      status: 'ok',
      recommendedCard: null,
      expectedBenefitCents: 0,
      bucketImpact: null,
      reasonCode: 'FALLBACK',
      ui: buildUiStub(),
    }),
  });
  mockModule(requireModule.resolve('@/lib/user-context'), {
    resolveUserContext: async () => ({ userId: 'user-1', mode: 'AUTHENTICATED', email: null }),
  });
  const { POST } =
    requireModule('../app/api/autopilot/preview/route');

  const res = await POST({
    json: async () => ({ amountCents: -1 }),
  });
  const body = await res.json();

  assert.equal(res.status, 400);
  assert.equal(body.code, 'INVALID_PAYLOAD');
  const lastEvent = logEvents.at(-1);
  assert.equal(lastEvent?.reason, 'INVALID_PAYLOAD');
}

async function runPreviewUnauthorized() {
  resetModules();
  mockNextServer();
  mockModule(requireModule.resolve('@/lib/log'), {
    logGuardrailEvent: () => {},
    logInvariantViolation: () => {},
  });
  mockModule(requireModule.resolve('@/lib/metrics/autopilot'), {
    incrementCounter: () => {},
    observeDuration: () => {},
  });
  mockModule(requireModule.resolve('@/lib/autopilot/service'), {
    getAutopilotPreview: async () => ({
      decisionId: 'decision-1',
      merchant: 'Test Shop',
      amountCents: 5_000,
      occurredAt: '2024-01-01T00:00:00.000Z',
      status: 'blocked',
      recommendedCard: null,
      expectedBenefitCents: 0,
      bucketImpact: null,
      reasonCode: 'NO_USER',
      ui: buildUiStub(),
    }),
  });
  mockModule(requireModule.resolve('@/lib/user-context'), {
    resolveUserContext: async () => {
      throw new Error('Unauthorized');
    },
  });
  const { POST } =
    requireModule('../app/api/autopilot/preview/route');

  const res = await POST({
    json: async () => ({ merchant: 'Test', amountCents: 1_000, category: 'OTHER' }),
  });
  const body = await res.json();

  assert.equal(res.status, 401);
  assert.equal(body.code, 'UNAUTHORIZED');
}

async function runPreviewUnexpectedError() {
  resetModules();
  mockNextServer();
  mockModule(requireModule.resolve('@/lib/log'), {
    logGuardrailEvent: () => {},
    logInvariantViolation: () => {},
  });
  mockModule(requireModule.resolve('@/lib/metrics/autopilot'), {
    incrementCounter: () => {},
    observeDuration: () => {},
  });
  mockModule(requireModule.resolve('@/lib/autopilot/service'), {
    getAutopilotPreview: async () => {
      throw new Error('boom');
    },
  });
  mockModule(requireModule.resolve('@/lib/user-context'), {
    resolveUserContext: async () => ({ userId: 'user-err', mode: 'AUTHENTICATED', email: null }),
  });

  const { POST } =
    requireModule('../app/api/autopilot/preview/route');

  const res = await POST({
    json: async () => ({ merchant: 'Test Err', amountCents: 1_000, category: 'OTHER' }),
  });
  const body = await res.json();

  assert.equal(res.status, 500);
  assert.equal(body.code, 'PREVIEW_UNEXPECTED_ERROR');
}

async function run() {
  await runPreviewValid();
  await runPreviewInvalid();
  await runPreviewUnauthorized();
  await runPreviewUnexpectedError();
  process.stdout.write('api-autopilot-preview: ok\n');
}

run().catch((err) => {
  const message =
    err instanceof Error ? err.stack ?? err.message : typeof err === 'string' ? err : JSON.stringify(err);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
