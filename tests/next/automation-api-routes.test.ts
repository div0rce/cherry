import * as assert from 'node:assert/strict';
import { prisma } from '../../lib/prisma.js';
import { PR_AUTOMATION_CLASSIFIER_VERSION } from '../../lib/automation/classifiers/types.js';

type MockRequest = {
  headers: Headers;
  url: string;
  json: () => Promise<unknown>;
};

function buildRequest(body: unknown, token: string): MockRequest {
  return {
    headers: new Headers({ authorization: `Bearer ${token}` }),
    url: 'https://cherry.test/api/automation',
    json: async () => body,
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  assert.equal(typeof value, 'object');
  assert.notEqual(value, null);
  return value as Record<string, unknown>;
}

async function run(): Promise<void> {
  const token = 'automation-test-token';
  process.env['CHERRY_AUTOMATION_TOKEN'] = token;
  process.env['GITHUB_TOKEN'] = 'github-test-token';

  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    return new Response(JSON.stringify({ id: `status-${fetchCalls}` }), { status: 201 });
  };

  try {
    const classifyRoute = await import('../../app/api/automation/classify/pr/route.js');
    const eventsRoute = await import('../../app/api/automation/events/route.js');
    const replayRoute = await import('../../app/api/automation/replay/route.js');
    const simulationRoute = await import(
      '../../app/api/automation/simulation-snapshots/compare/route.js'
    );
    const githubStatusRoute = await import('../../app/api/automation/statuses/github/route.js');
    const githubStatusRetryRoute = await import(
      '../../app/api/automation/statuses/github/retry/route.js'
    );
    const statusesRoute = await import('../../app/api/automation/statuses/route.js');

    const classifyResponse = await classifyRoute.POST(
      buildRequest(
        {
          repo: 'div0rce/cherry',
          sha: 'route-sha',
          prNumber: 333,
          title: 'API change without docs',
          body: '',
          labels: [],
          files: [{ filename: 'app/api/scan/route.ts', status: 'modified' }],
          sourceWorkflow: 'route-test',
        },
        token
      ) as never
    );
    assert.equal(classifyResponse.status, 200);
    const classifyBody = asRecord(await classifyResponse.json());
    assert.equal(classifyBody['ok'], true);
    const automationEventId = classifyBody['automationEventId'];
    const outputHash = classifyBody['outputHash'];
    assert.equal(typeof automationEventId, 'string');
    assert.equal(typeof outputHash, 'string');
    const classifierOutput = asRecord(classifyBody['classifierOutput']);
    assert.equal(Object.prototype.hasOwnProperty.call(classifierOutput, 'outputHash'), false);

    const replayResponse = await replayRoute.POST(
      buildRequest(
        {
          automationEventId,
          classifierVersion: PR_AUTOMATION_CLASSIFIER_VERSION,
        },
        token
      ) as never
    );
    assert.equal(replayResponse.status, 200);
    const replayBody = asRecord(await replayResponse.json());
    assert.equal(replayBody['matches'], true);
    assert.equal(replayBody['outputHash'], outputHash);

    const eventIngestBody = {
      repo: 'div0rce/cherry',
      sha: 'route-event-sha',
      event: 'manual.test',
      source: 'manual',
      workflow: 'route-test',
      status: 'accepted',
      idempotencyKey: 'route-event-conflict',
      classifierVersion: PR_AUTOMATION_CLASSIFIER_VERSION,
      rawPayload: {},
      normalizedEvent: {
        event: 'manual.test',
        source: 'manual',
        repo: 'div0rce/cherry',
        timestamp: '1970-01-01T00:00:00.000Z',
        payload: {},
      },
      classifierOutput: { value: 1 },
    };
    const eventIngestResponse = await eventsRoute.POST(
      buildRequest(eventIngestBody, token) as never
    );
    assert.equal(eventIngestResponse.status, 200);
    const eventConflictResponse = await eventsRoute.POST(
      buildRequest(
        {
          ...eventIngestBody,
          classifierOutput: { value: 2 },
        },
        token
      ) as never
    );
    assert.equal(eventConflictResponse.status, 409);
    assert.deepEqual(await eventConflictResponse.json(), {
      error: 'automation_event_idempotency_conflict',
    });

    const invalidStatusResponse = await githubStatusRoute.POST(
      buildRequest(
        {
          repo: 'div0rce/cherry',
          sha: 'route-sha',
          context: 'cherry/not-allowed',
          state: 'failure',
          description: 'Invalid context',
          sourceWorkflow: 'route-test',
          classifierVersion: PR_AUTOMATION_CLASSIFIER_VERSION,
          outputHash,
        },
        token
      ) as never
    );
    assert.equal(invalidStatusResponse.status, 400);

    const statusResponse = await githubStatusRoute.POST(
      buildRequest(
        {
          repo: 'div0rce/cherry',
          sha: 'route-sha',
          context: 'cherry/docs-drift',
          state: 'failure',
          description: 'Docs drift detected.',
          targetUrl: 'https://example.com/automation/status/route',
          sourceWorkflow: 'route-test',
          automationEventId,
          classifierVersion: PR_AUTOMATION_CLASSIFIER_VERSION,
          outputHash,
        },
        token
      ) as never
    );
    assert.equal(statusResponse.status, 200);
    const statusBody = asRecord(await statusResponse.json());
    assert.equal(statusBody['posted'], true);

    const duplicateStatusResponse = await githubStatusRoute.POST(
      buildRequest(
        {
          repo: 'div0rce/cherry',
          sha: 'route-sha',
          context: 'cherry/docs-drift',
          state: 'success',
          description: 'Changed fields should not create another status.',
          targetUrl: 'https://example.com/api/debts/123/mutate',
          sourceWorkflow: 'route-test',
          automationEventId,
          classifierVersion: PR_AUTOMATION_CLASSIFIER_VERSION,
          outputHash,
        },
        token
      ) as never
    );
    assert.equal(duplicateStatusResponse.status, 200);
    const duplicateStatusBody = asRecord(await duplicateStatusResponse.json());
    assert.equal(duplicateStatusBody['posted'], false);
    assert.equal(duplicateStatusBody['idempotent'], true);
    assert.equal(duplicateStatusBody['statusCheckId'], statusBody['statusCheckId']);
    assert.equal(fetchCalls, 1);

    const retryResponse = await githubStatusRetryRoute.POST(
      buildRequest({ id: statusBody['statusCheckId'] }, token) as never
    );
    assert.equal(retryResponse.status, 200);
    const retryBody = asRecord(await retryResponse.json());
    assert.equal(retryBody['retried'], true);
    const retriedStatus = asRecord(retryBody['statusCheck']);
    assert.equal(retriedStatus['id'], statusBody['statusCheckId']);
    assert.equal(fetchCalls, 2);

    const retryByKeyResponse = await githubStatusRetryRoute.POST(
      buildRequest(
        { statusIdempotencyKey: String(retriedStatus['statusIdempotencyKey']) },
        token
      ) as never
    );
    assert.equal(retryByKeyResponse.status, 200);
    assert.equal(fetchCalls, 3);

    const retryMissingResponse = await githubStatusRetryRoute.POST(
      buildRequest({ id: 'missing-status-check' }, token) as never
    );
    assert.equal(retryMissingResponse.status, 404);

    const auditResponse = await statusesRoute.GET({
      headers: new Headers({ authorization: `Bearer ${token}` }),
      url: 'https://cherry.test/api/automation/statuses?repo=div0rce/cherry&sha=route-sha&context=cherry/docs-drift',
      json: async () => ({}),
    } as never);
    assert.equal(auditResponse.status, 200);
    const auditBody = asRecord(await auditResponse.json());
    const statuses = auditBody['statuses'];
    assert.ok(Array.isArray(statuses));
    assert.equal(statuses.length, 1);
    const firstStatus = asRecord(statuses[0]);
    assert.equal(firstStatus['context'], 'cherry/docs-drift');
    assert.equal(firstStatus['targetUrl'], 'https://example.com/automation/status/route');
    assert.equal(firstStatus['automationEventId'], automationEventId);

    const forbiddenRetryStatus = await prisma.automationStatusCheck.create({
      data: {
        repo: 'div0rce/cherry',
        sha: 'route-forbidden-retry',
        context: 'cherry/risk-gate',
        state: 'failure',
        description: 'Forbidden retry target.',
        targetUrl: 'https://example.com/api/debts/123/mutate',
        sourceWorkflow: 'route-test',
        classifierVersion: PR_AUTOMATION_CLASSIFIER_VERSION,
        outputHash: 'route-forbidden-retry-hash',
        statusIdempotencyKey: 'route-forbidden-retry-key',
        githubResponse: {},
      },
    });
    const forbiddenRetryResponse = await githubStatusRetryRoute.POST(
      buildRequest({ id: forbiddenRetryStatus.id }, token) as never
    );
    assert.equal(forbiddenRetryResponse.status, 400);

    const unsupportedRetryStatus = await prisma.automationStatusCheck.create({
      data: {
        repo: 'div0rce/cherry',
        sha: 'route-unsupported-retry',
        context: 'cherry/not-allowed',
        state: 'failure',
        description: 'Unsupported retry context.',
        targetUrl: 'https://example.com/automation/status/unsupported',
        sourceWorkflow: 'route-test',
        classifierVersion: PR_AUTOMATION_CLASSIFIER_VERSION,
        outputHash: 'route-unsupported-retry-hash',
        statusIdempotencyKey: 'route-unsupported-retry-key',
        githubResponse: {},
      },
    });
    const unsupportedRetryResponse = await githubStatusRetryRoute.POST(
      buildRequest({ id: unsupportedRetryStatus.id }, token) as never
    );
    assert.equal(unsupportedRetryResponse.status, 400);

    const simulationBody = {
      repo: 'div0rce/cherry',
      scopeKey: 'route-simulation',
      runId: 'route-run',
      sourceWorkflow: 'route-test',
      snapshot: {
        score: 80,
        allocation: { cardA: 10_000 },
        strategy: 'minimum',
        runwayDays: 30,
        viableCandidateCount: 2,
      },
    };
    const simulationResponse = await simulationRoute.POST(
      buildRequest(simulationBody, token) as never
    );
    assert.equal(simulationResponse.status, 200);
    const simulationDuplicateConflictResponse = await simulationRoute.POST(
      buildRequest(
        {
          ...simulationBody,
          snapshot: {
            score: 10,
            allocation: { cardA: 100 },
            strategy: 'changed',
            runwayDays: 1,
            viableCandidateCount: 0,
          },
        },
        token
      ) as never
    );
    assert.equal(simulationDuplicateConflictResponse.status, 409);
    assert.deepEqual(await simulationDuplicateConflictResponse.json(), {
      error: 'simulation_snapshot_idempotency_conflict',
    });
  } finally {
    globalThis.fetch = originalFetch;
    await prisma.automationStatusCheck.deleteMany({ where: {} });
    await prisma.simulationAutomationSnapshot.deleteMany({ where: {} });
    await prisma.automationEvent.deleteMany({ where: {} });
  }

  console.warn('automation API routes: ok');
}

run().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
