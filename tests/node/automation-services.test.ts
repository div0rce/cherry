import * as assert from 'node:assert/strict';
import { prisma } from '../../lib/prisma.js';
import {
  classifyAndStorePrAutomation,
  compareAndStoreSimulationSnapshot,
  replayAutomationEvent,
  storeAutomationEvent,
  outputHashFor,
} from '../../lib/automation/events.js';
import { createAutomationEventRecord } from '../../lib/adapters/runtime/automation-events.prisma.js';
import { createGithubStatusCheckRecord } from '../../lib/adapters/runtime/automation-github-status.prisma.js';
import { classifyPrAutomation } from '../../lib/automation/classifiers/pr.js';
import {
  buildStatusIdempotencyKey,
  listLatestGithubStatuses,
  postGithubStatus,
  retryGithubStatus,
} from '../../lib/automation/github-status.js';
import { PR_AUTOMATION_CLASSIFIER_VERSION } from '../../lib/automation/classifiers/types.js';

async function runReplayHashTest(): Promise<void> {
  const result = await classifyAndStorePrAutomation({
    repo: 'div0rce/cherry',
    sha: 'sha-replay',
    prNumber: 101,
    title: 'touch api without docs',
    body: '',
    labels: [],
    files: [{ filename: 'app/api/scan/route.ts', status: 'modified' }],
    sourceWorkflow: 'test',
  });
  const replay = await replayAutomationEvent(
    result.event.id,
    PR_AUTOMATION_CLASSIFIER_VERSION
  );
  assert.ok(replay);
  assert.equal(replay.matches, true);
  assert.equal(replay.outputHash, result.event.outputHash);

  const replayInput = {
    repo: 'div0rce/cherry',
    sha: 'sha-replay-direct',
    prNumber: 102,
    title: 'touch api without docs',
    body: '',
    labels: [],
    files: [{ filename: 'app/api/scan/route.ts', status: 'modified' }],
  };
  const recomputed = classifyPrAutomation(replayInput);
  const directEvent = await createAutomationEventRecord({
    repo: replayInput.repo,
    sha: replayInput.sha,
    event: 'github.pull_request',
    source: 'github',
    workflow: 'test',
    status: 'accepted',
    idempotencyKey: 'direct-replay-corrupt-output',
    classifierVersion: PR_AUTOMATION_CLASSIFIER_VERSION,
    outputHash: outputHashFor(recomputed),
    rawPayload: replayInput,
    normalizedEvent: {
      event: 'github.pull_request',
      source: 'github',
      repo: replayInput.repo,
      timestamp: '1970-01-01T00:00:00.000Z',
      payload: {
        prNumber: replayInput.prNumber,
        title: replayInput.title,
        body: replayInput.body,
        labels: replayInput.labels,
        files: replayInput.files,
      },
    },
    classifierOutput: { stale: true },
    prNumber: replayInput.prNumber,
  });
  const directReplay = await replayAutomationEvent(
    directEvent.id,
    PR_AUTOMATION_CLASSIFIER_VERSION
  );
  assert.ok(directReplay);
  assert.equal(directReplay.matches, true);
  assert.deepEqual(directReplay.replayedOutput, recomputed);

  const mismatchEvent = await createAutomationEventRecord({
    repo: replayInput.repo,
    sha: 'sha-replay-mismatch',
    event: 'github.pull_request',
    source: 'github',
    workflow: 'test',
    status: 'accepted',
    idempotencyKey: 'direct-replay-mismatch-output',
    classifierVersion: PR_AUTOMATION_CLASSIFIER_VERSION,
    outputHash: 'not-the-recomputed-hash',
    rawPayload: replayInput,
    normalizedEvent: directEvent.normalizedEvent,
    classifierOutput: recomputed,
    prNumber: replayInput.prNumber,
  });
  const mismatchReplay = await replayAutomationEvent(
    mismatchEvent.id,
    PR_AUTOMATION_CLASSIFIER_VERSION
  );
  assert.ok(mismatchReplay);
  assert.equal(mismatchReplay.matches, false);
  assert.equal(mismatchReplay.reason, 'output_hash_mismatch');

  const wrongVersionReplay = await replayAutomationEvent(
    directEvent.id,
    'pr-automation@0'
  );
  assert.ok(wrongVersionReplay);
  assert.equal(wrongVersionReplay.matches, false);
  assert.equal(wrongVersionReplay.reason, 'classifier_version_mismatch');

  const unsupportedEvent = await createAutomationEventRecord({
    repo: replayInput.repo,
    sha: 'sha-replay-unsupported',
    event: 'manual.test',
    source: 'manual',
    workflow: 'test',
    status: 'accepted',
    idempotencyKey: 'direct-replay-unsupported-event',
    classifierVersion: PR_AUTOMATION_CLASSIFIER_VERSION,
    outputHash: outputHashFor({ unsupported: true }),
    rawPayload: {},
    normalizedEvent: {
      event: 'manual.test',
      source: 'manual',
      repo: replayInput.repo,
      timestamp: '1970-01-01T00:00:00.000Z',
      payload: {},
    },
    classifierOutput: { unsupported: true },
  });
  const unsupportedReplay = await replayAutomationEvent(
    unsupportedEvent.id,
    PR_AUTOMATION_CLASSIFIER_VERSION
  );
  assert.ok(unsupportedReplay);
  assert.equal(unsupportedReplay.matches, false);
  assert.equal(unsupportedReplay.reason, 'unsupported_replay_event');

  const invalidEvent = await createAutomationEventRecord({
    repo: replayInput.repo,
    sha: 'sha-replay-invalid',
    event: 'github.pull_request',
    source: 'github',
    workflow: 'test',
    status: 'accepted',
    idempotencyKey: 'direct-replay-invalid-input',
    classifierVersion: PR_AUTOMATION_CLASSIFIER_VERSION,
    outputHash: outputHashFor({ invalid: true }),
    rawPayload: {},
    normalizedEvent: {
      event: 'github.pull_request',
      source: 'github',
      repo: replayInput.repo,
      timestamp: '1970-01-01T00:00:00.000Z',
      payload: { prNumber: 404 },
    },
    classifierOutput: { invalid: true },
  });
  const invalidReplay = await replayAutomationEvent(
    invalidEvent.id,
    PR_AUTOMATION_CLASSIFIER_VERSION
  );
  assert.ok(invalidReplay);
  assert.equal(invalidReplay.matches, false);
  assert.equal(invalidReplay.reason, 'invalid_replay_input');
}

async function runAutomationEventIdempotencyConflictTest(): Promise<void> {
  const base = {
    repo: 'div0rce/cherry',
    event: 'manual.test',
    source: 'manual',
    workflow: 'test',
    status: 'accepted',
    idempotencyKey: 'event-conflict-key',
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
  const first = await storeAutomationEvent(base);
  const duplicate = await storeAutomationEvent({ ...base });
  assert.equal(first.created, true);
  assert.equal(duplicate.created, false);
  await assert.rejects(
    storeAutomationEvent({ ...base, classifierOutput: { value: 2 } }),
    /automation_event_idempotency_conflict/
  );
}

async function runStatusIdempotencyTest(): Promise<void> {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response(JSON.stringify({ id: calls }), { status: 201 });
  };

  try {
    const linkedEvent = await storeAutomationEvent({
      repo: 'div0rce/cherry',
      sha: 'sha-status',
      event: 'manual.status',
      source: 'manual',
      workflow: 'test',
      status: 'accepted',
      idempotencyKey: 'status-linked-event',
      classifierVersion: PR_AUTOMATION_CLASSIFIER_VERSION,
      rawPayload: {},
      normalizedEvent: {
        event: 'manual.status',
        source: 'manual',
        repo: 'div0rce/cherry',
        timestamp: '1970-01-01T00:00:00.000Z',
        payload: {},
      },
      classifierOutput: { value: 'status' },
    });
    const input = {
      repo: 'div0rce/cherry',
      sha: 'sha-status',
      context: 'cherry/forbidden-change' as const,
      state: 'failure' as const,
      description: 'Forbidden change detected.',
      targetUrl: 'https://example.com/status/first',
      sourceWorkflow: 'test',
      automationEventId: linkedEvent.event.id,
      classifierVersion: PR_AUTOMATION_CLASSIFIER_VERSION,
      outputHash: 'hash-status',
    };
    const first = await postGithubStatus(input, { githubToken: 'token' });
    assert.equal(
      buildStatusIdempotencyKey({
        ...input,
        state: 'success',
        description: 'Changed description should not affect status identity.',
        targetUrl: 'https://example.com/status/changed',
      }),
      buildStatusIdempotencyKey(input)
    );
    const second = await postGithubStatus(
      {
        ...input,
        state: 'success',
        description: 'Changed description should not change status identity.',
        targetUrl: 'https://example.com/status/second',
      },
      { githubToken: 'token' }
    );
    assert.equal(first.posted, true);
    assert.equal(second.posted, false);
    assert.equal(second.idempotent, true);
    assert.equal(calls, 1);
    assert.equal(first.statusCheck.statusIdempotencyKey, buildStatusIdempotencyKey(input));
    assert.equal(first.statusCheck.targetUrl, 'https://example.com/status/first');
    assert.equal(first.statusCheck.automationEventId, linkedEvent.event.id);
    assert.equal(second.statusCheck.id, first.statusCheck.id);
    const countBeforeRetry = await prisma.automationStatusCheck.count({
      where: { statusIdempotencyKey: first.statusCheck.statusIdempotencyKey },
    });
    const retry = await retryGithubStatus(
      { id: first.statusCheck.id },
      { githubToken: 'token' }
    );
    assert.equal(retry.retried, true);
    assert.equal(retry.statusCheck.id, first.statusCheck.id);
    assert.equal(calls, 2);
    const retryByKey = await retryGithubStatus(
      { statusIdempotencyKey: first.statusCheck.statusIdempotencyKey },
      { githubToken: 'token' }
    );
    assert.equal(retryByKey.statusCheck.id, first.statusCheck.id);
    assert.equal(calls, 3);
    const countAfterRetry = await prisma.automationStatusCheck.count({
      where: { statusIdempotencyKey: first.statusCheck.statusIdempotencyKey },
    });
    assert.equal(countAfterRetry, countBeforeRetry);
    await assert.rejects(
      retryGithubStatus({ id: 'missing-status-check' }, { githubToken: 'token' }),
      /github_status_not_found/
    );

    const unsupportedStatus = await createGithubStatusCheckRecord({
      repo: 'div0rce/cherry',
      sha: 'sha-retry-unsupported-context',
      context: 'cherry/not-allowed',
      state: 'failure',
      description: 'Unsupported retry context.',
      targetUrl: 'https://example.com/status/unsupported',
      sourceWorkflow: 'test',
      classifierVersion: PR_AUTOMATION_CLASSIFIER_VERSION,
      outputHash: 'hash-retry-unsupported',
      statusIdempotencyKey: 'retry-unsupported-context',
    });
    await assert.rejects(
      retryGithubStatus({ id: unsupportedStatus.id }, { githubToken: 'token' }),
      /Unsupported GitHub status context/
    );

    const latest = await listLatestGithubStatuses({
      repo: 'div0rce/cherry',
      sha: 'sha-status',
      context: 'cherry/forbidden-change',
    });
    assert.equal(latest.length, 1);
    assert.equal(latest[0]?.context, 'cherry/forbidden-change');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function runStatusRejectsForbiddenTargetUrl(): Promise<void> {
  await assert.rejects(
    postGithubStatus(
      {
        repo: 'div0rce/cherry',
        sha: 'sha-forbidden-url',
        context: 'cherry/risk-gate',
        state: 'failure',
        description: 'Bad target URL.',
        targetUrl: 'https://example.com/api/ledger/write',
        sourceWorkflow: 'test',
        classifierVersion: PR_AUTOMATION_CLASSIFIER_VERSION,
        outputHash: 'hash-url',
      },
      { githubToken: 'token' }
    ),
    /forbidden Cherry finance endpoint/
  );
  await assert.rejects(
    postGithubStatus(
      {
        repo: 'div0rce/cherry',
        sha: 'sha-forbidden-url-debt',
        context: 'cherry/risk-gate',
        state: 'failure',
        description: 'Bad target URL.',
        targetUrl: 'https://example.com/api/debts/123/mutate',
        sourceWorkflow: 'test',
        classifierVersion: PR_AUTOMATION_CLASSIFIER_VERSION,
        outputHash: 'hash-url-debt',
      },
      { githubToken: 'token' }
    ),
    /forbidden Cherry finance endpoint/
  );
}

async function runStatusRetryRejectsForbiddenTargetUrl(): Promise<void> {
  const statusCheck = await createGithubStatusCheckRecord({
    repo: 'div0rce/cherry',
    sha: 'sha-retry-forbidden-url',
    context: 'cherry/risk-gate',
    state: 'failure',
    description: 'Bad retry target.',
    targetUrl: 'https://example.com/api/debt/123/mutate',
    sourceWorkflow: 'test',
    classifierVersion: PR_AUTOMATION_CLASSIFIER_VERSION,
    outputHash: 'hash-retry-forbidden',
    statusIdempotencyKey: 'retry-forbidden-status',
  });
  await assert.rejects(
    retryGithubStatus({ id: statusCheck.id }, { githubToken: 'token' }),
    /forbidden Cherry finance endpoint/
  );
}

async function runSimulationSnapshotTest(): Promise<void> {
  const first = await compareAndStoreSimulationSnapshot({
    repo: 'div0rce/cherry',
    scopeKey: 'scenario-a',
    runId: 'run-1',
    sourceWorkflow: 'test',
    snapshot: {
      score: 90,
      allocation: { cardA: 10_000 },
      strategy: 'minimum',
      runwayDays: 30,
      viableCandidateCount: 2,
    },
  });
  assert.equal(first.created, true);
  assert.equal(first.comparisonOutput.drift, false);

  const second = await compareAndStoreSimulationSnapshot({
    repo: 'div0rce/cherry',
    scopeKey: 'scenario-a',
    runId: 'run-2',
    sourceWorkflow: 'test',
    snapshot: {
      score: 70,
      allocation: { cardA: 1_000 },
      strategy: 'aggressive',
      runwayDays: 5,
      viableCandidateCount: 0,
    },
  });
  assert.equal(second.created, true);
  assert.equal(second.comparisonOutput.drift, true);

  const duplicate = await compareAndStoreSimulationSnapshot({
    repo: 'div0rce/cherry',
    scopeKey: 'scenario-a',
    runId: 'run-2',
    sourceWorkflow: 'test',
    snapshot: {
      score: 70,
      allocation: { cardA: 1_000 },
      strategy: 'aggressive',
      runwayDays: 5,
      viableCandidateCount: 0,
    },
  });
  assert.equal(duplicate.created, false);
  assert.deepEqual(duplicate.comparisonOutput, second.comparisonOutput);

  await assert.rejects(
    compareAndStoreSimulationSnapshot({
      repo: 'div0rce/cherry',
      scopeKey: 'scenario-a',
      runId: 'run-2',
      sourceWorkflow: 'test',
      snapshot: {
        score: 100,
        allocation: { cardA: 2_000 },
        strategy: 'changed',
        runwayDays: 50,
        viableCandidateCount: 3,
      },
    }),
    /simulation_snapshot_idempotency_conflict/
  );
}

async function run(): Promise<void> {
  await runReplayHashTest();
  await runAutomationEventIdempotencyConflictTest();
  await runStatusIdempotencyTest();
  await runStatusRejectsForbiddenTargetUrl();
  await runStatusRetryRejectsForbiddenTargetUrl();
  await runSimulationSnapshotTest();
  await prisma.automationStatusCheck.deleteMany({ where: {} });
  await prisma.simulationAutomationSnapshot.deleteMany({ where: {} });
  await prisma.automationEvent.deleteMany({ where: {} });
  console.warn('automation services: ok');
}

run().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
