import * as assert from 'node:assert/strict';
import * as Module from 'node:module';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const requireModule = Module.createRequire(__filename);

function mockModule(modulePath: string, exports: unknown): void {
  requireModule.cache[modulePath] = {
    id: modulePath,
    filename: modulePath,
    loaded: true,
    exports,
  } as NodeModule;
}

function mockNextServer(): void {
  class MockResponse extends Response {
    static override json(body: unknown, init: ResponseInit = {}): Response {
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
    const alt = requireModule.resolve('next/server');
    mockModule(alt, exports);
  } catch (error: unknown) {
    void error;
    // ignore
  }
}

function resetModules(): void {
  const targets = [
    '../../app/api/autopilot/preview/route',
    '../../app/api/autopilot/commit/route',
    'next/server',
    '../../lib/log',
    '../../lib/autopilot/service',
    '../../lib/user-context',
    '../../lib/autopilot/uiSpec',
  ];
  for (const target of targets) {
    try {
      const resolved = requireModule.resolve(target);
      delete requireModule.cache[resolved];
    } catch (error: unknown) {
      void error;
      // ignore
    }
  }
}

function buildUiStub() {
  const { getAutopilotUiSpec } = requireModule('../../lib/autopilot/uiSpec.js') as typeof import('../../lib/autopilot/uiSpec.js');
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
      primary: 'ok',
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

async function runUserContextPreview(): Promise<void> {
  resetModules();
  mockNextServer();
  const capturedOptions: unknown[] = [];
  mockModule(requireModule.resolve('../../lib/log'), {
    logGuardrailEvent: (): void => {},
    logInvariantViolation: (): void => {},
  });
  mockModule(requireModule.resolve('../../lib/autopilot/service'), {
    getAutopilotPreview: async () => ({
      decisionId: 'decision-ctx-1',
      merchant: 'Shop',
      amountCents: 500,
      occurredAt: '2024-01-01T00:00:00.000Z',
      status: 'ok',
      recommendedCard: { id: 'card-1', label: 'Alpha', issuer: 'Issuer', network: 'VISA' },
      expectedBenefitCents: 10,
      bucketImpact: null,
      reasonCode: 'OK',
      authority: {
        version: 'authority_v1',
        verdict: 'ALLOW_SIMULATED',
        severity: 0,
        reasons: [{ code: 'DAILY_STATE_RISKY', severity: 0, detail: 'ok' }],
        explanation: 'ok',
        inputsVersion: 'hash',
        engineVersion: 'test',
        counterfactuals: [],
      },
      ui: buildUiStub(),
    }),
  });
  mockModule(requireModule.resolve('../../lib/user-context'), {
    resolveUserContext: async (opts: unknown) => {
      capturedOptions.push(opts);
      return { userId: 'user-ctx-1', mode: 'AUTHENTICATED', email: null };
    },
  });

  const { POST } =
    requireModule('../../app/api/autopilot/preview/route.js') as typeof import('../../app/api/autopilot/preview/route.js');

  const res = await POST({
    json: async () => ({ merchant: 'Shop', amountCents: 500, category: 'DINING' }),
  } as never);
  await res.json();

  assert.equal(res.status, 200);
  const opts = capturedOptions[0] as { requireAuth?: boolean; allowLabDemo?: boolean };
  assert.equal(opts.requireAuth, true);
  assert.equal(opts.allowLabDemo, true);
}

async function runUserContextCommit(): Promise<void> {
  resetModules();
  mockNextServer();
  const capturedOptions: unknown[] = [];
  mockModule(requireModule.resolve('../../lib/log'), {
    logGuardrailEvent: (): void => {},
  });
  mockModule(requireModule.resolve('../../lib/autopilot/service'), {
    commitAutopilotDecision: async () => ({
      decisionId: 'decision-ctx-2',
      transactionId: 'txn-ctx-2',
      bucket: null,
      status: 'created',
    }),
  });
  mockModule(requireModule.resolve('../../lib/user-context'), {
    resolveUserContext: async (opts: unknown) => {
      capturedOptions.push(opts);
      return { userId: 'user-ctx-2', mode: 'AUTHENTICATED', email: null };
    },
  });

  const { POST } =
    requireModule('../../app/api/autopilot/commit/route.js') as typeof import('../../app/api/autopilot/commit/route.js');

  const res = await POST({
    json: async () => ({
      decisionId: 'decision-ctx-2',
      merchant: 'Shop',
      amountCents: 500,
      cardId: 'card-1',
      occurredAt: '2024-01-10T00:00:00.000Z',
    }),
  } as never);
  await res.json();

  assert.equal(res.status, 200);
  const opts = capturedOptions[0] as { requireAuth?: boolean; allowLabDemo?: boolean };
  assert.equal(opts.requireAuth, true);
  assert.equal(opts.allowLabDemo, true);
}

async function run(): Promise<void> {
  await runUserContextPreview();
  await runUserContextCommit();
  process.stdout.write('api-autopilot-user-context: ok\n');
}

run().catch((err) => {
  const message =
    err instanceof Error ? err.stack ?? err.message : typeof err === 'string' ? err : JSON.stringify(err);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
