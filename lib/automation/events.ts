import type { AutomationEvent, SimulationAutomationSnapshot } from '@prisma/client';
import {
  createAutomationEventRecord,
  createSimulationAutomationSnapshotRecord,
  findAutomationEventById,
  findAutomationEventByIdempotencyKey,
  findLatestSimulationSnapshot,
  findSimulationSnapshotByRun,
} from '../adapters/runtime/automation-events.prisma.js';
import { buildAutomationIdempotencyKey, hashAutomationOutput } from './hash.js';
import { classifyPrAutomation } from './classifiers/pr.js';
import { classifySimulationDrift } from './classifiers/simulation-drift.js';
import {
  PR_AUTOMATION_CLASSIFIER_VERSION,
  SIMULATION_DRIFT_CLASSIFIER_VERSION,
} from './classifiers/types.js';
import type { AutomationFileChange } from './classifiers/types.js';
import type { PrClassifierInput } from './classifiers/types.js';
import type { PrAutomationClassification } from './classifiers/pr.js';
import type { SimulationDriftClassification } from './classifiers/simulation-drift.js';

export type StoreAutomationEventInput = {
  repo: string;
  sha?: string | undefined;
  event: string;
  source: string;
  workflow: string;
  status: string;
  idempotencyKey: string;
  classifierVersion: string;
  rawPayload: unknown;
  normalizedEvent: unknown;
  classifierOutput: unknown;
  prNumber?: number | undefined;
  issueNumber?: number | undefined;
};

export type PrAutomationInput = {
  repo: string;
  sha: string;
  prNumber: number;
  title: string;
  body?: string | null | undefined;
  labels: string[];
  files: AutomationFileChange[];
  sourceWorkflow: string;
  eventId?: string | undefined;
};

export type SimulationCompareInput = {
  repo: string;
  scopeKey: string;
  runId: string;
  snapshot: unknown;
  sourceWorkflow: string;
};

export type StoredAutomationEventResult = {
  event: AutomationEvent;
  created: boolean;
};

export type PrAutomationStoreResult = StoredAutomationEventResult & {
  classifierOutput: PrAutomationClassification;
};

export type ReplayAutomationEventResult =
  | {
      event: AutomationEvent;
      replayedOutput: unknown;
      outputHash: string | null;
      matches: boolean;
      reason:
        | 'matched'
        | 'output_hash_mismatch'
        | 'classifier_version_mismatch'
        | 'unsupported_replay_event'
        | 'invalid_replay_input';
    }
  | null;

export type SimulationSnapshotStoreResult = {
  snapshot: SimulationAutomationSnapshot;
  comparisonOutput: SimulationDriftClassification;
  created: boolean;
};

export function outputHashFor(value: unknown): string {
  return hashAutomationOutput(value);
}

export class AutomationEventIdempotencyConflictError extends Error {
  constructor(readonly idempotencyKey: string) {
    super('automation_event_idempotency_conflict');
    this.name = 'AutomationEventIdempotencyConflictError';
  }
}

export class SimulationSnapshotIdempotencyConflictError extends Error {
  constructor(readonly scopeKey: string, readonly runId: string) {
    super('simulation_snapshot_idempotency_conflict');
    this.name = 'SimulationSnapshotIdempotencyConflictError';
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const out: string[] = [];
  for (const entry of value) {
    if (typeof entry !== 'string') return null;
    out.push(entry);
  }
  return out;
}

function asAutomationFiles(value: unknown): AutomationFileChange[] | null {
  if (!Array.isArray(value)) return null;
  const out: AutomationFileChange[] = [];
  for (const entry of value) {
    const record = asRecord(entry);
    if (record === null || typeof record['filename'] !== 'string') return null;
    const file: AutomationFileChange = { filename: record['filename'] };
    if (typeof record['status'] === 'string') file.status = record['status'];
    if (typeof record['additions'] === 'number') file.additions = record['additions'];
    if (typeof record['deletions'] === 'number') file.deletions = record['deletions'];
    if (typeof record['changes'] === 'number') file.changes = record['changes'];
    if (typeof record['patch'] === 'string') file.patch = record['patch'];
    out.push(file);
  }
  return out;
}

function rebuildPrClassifierInput(event: AutomationEvent): PrClassifierInput | null {
  const normalized = asRecord(event.normalizedEvent);
  const payload = normalized === null ? null : asRecord(normalized['payload']);
  if (payload === null) return null;
  const prNumber = payload['prNumber'];
  const title = payload['title'];
  const body = payload['body'];
  const labels = asStringArray(payload['labels']);
  const files = asAutomationFiles(payload['files']);
  if (
    typeof event.sha !== 'string' ||
    typeof prNumber !== 'number' ||
    typeof title !== 'string' ||
    labels === null ||
    files === null
  ) {
    return null;
  }
  return {
    repo: event.repo,
    sha: event.sha,
    prNumber,
    title,
    body: typeof body === 'string' ? body : '',
    labels,
    files,
  };
}

export async function storeAutomationEvent(
  input: StoreAutomationEventInput
): Promise<StoredAutomationEventResult> {
  const classifierOutput = input.classifierOutput;
  const outputHash = outputHashFor(classifierOutput);
  const existing = await findAutomationEventByIdempotencyKey(input.idempotencyKey);
  if (existing !== null) {
    if (
      existing.classifierVersion !== input.classifierVersion ||
      existing.outputHash !== outputHash
    ) {
      throw new AutomationEventIdempotencyConflictError(input.idempotencyKey);
    }
    return { event: existing, created: false };
  }

  const event = await createAutomationEventRecord({
    repo: input.repo,
    sha: input.sha,
    event: input.event,
    source: input.source,
    workflow: input.workflow,
    status: input.status,
    idempotencyKey: input.idempotencyKey,
    classifierVersion: input.classifierVersion,
    outputHash,
    rawPayload: input.rawPayload,
    normalizedEvent: input.normalizedEvent,
    classifierOutput,
    prNumber: input.prNumber,
    issueNumber: input.issueNumber,
  });

  return { event, created: true };
}

export async function classifyAndStorePrAutomation(
  input: PrAutomationInput
): Promise<PrAutomationStoreResult> {
  const classifierOutput = classifyPrAutomation({
    repo: input.repo,
    sha: input.sha,
    prNumber: input.prNumber,
    title: input.title,
    body: input.body ?? '',
    labels: input.labels,
    files: input.files,
  });
  const outputHash = outputHashFor(classifierOutput);
  const idempotencyKey = buildAutomationIdempotencyKey([
    'pr-classification',
    input.repo,
    input.sha,
    String(input.prNumber),
    PR_AUTOMATION_CLASSIFIER_VERSION,
    outputHash,
  ]);
  const normalizedEvent = {
    event: 'github.pull_request',
    source: 'github',
    repo: input.repo,
    timestamp: '1970-01-01T00:00:00.000Z',
    payload: {
      prNumber: input.prNumber,
      title: input.title,
      body: input.body ?? '',
      labels: input.labels,
      files: input.files,
    },
  };
  const stored = await storeAutomationEvent({
    repo: input.repo,
    sha: input.sha,
    event: normalizedEvent.event,
    source: normalizedEvent.source,
    workflow: input.sourceWorkflow,
    status: 'accepted',
    idempotencyKey,
    classifierVersion: PR_AUTOMATION_CLASSIFIER_VERSION,
    rawPayload: normalizedEvent.payload,
    normalizedEvent,
    classifierOutput,
    prNumber: input.prNumber,
  });

  return { ...stored, classifierOutput };
}

export async function replayAutomationEvent(
  id: string,
  classifierVersion: string
): Promise<ReplayAutomationEventResult> {
  const event = await findAutomationEventById(id);
  if (event === null) {
    return null;
  }
  if (event.classifierVersion !== classifierVersion) {
    return {
      event,
      replayedOutput: null,
      outputHash: null,
      matches: false,
      reason: 'classifier_version_mismatch',
    };
  }

  if (event.event !== 'github.pull_request') {
    return {
      event,
      replayedOutput: null,
      outputHash: null,
      matches: false,
      reason: 'unsupported_replay_event',
    };
  }

  const replayInput = rebuildPrClassifierInput(event);
  if (replayInput === null) {
    return {
      event,
      replayedOutput: null,
      outputHash: null,
      matches: false,
      reason: 'invalid_replay_input',
    };
  }

  const replayedOutput = classifyPrAutomation(replayInput);
  const outputHash = outputHashFor(replayedOutput);
  return {
    event,
    replayedOutput,
    outputHash,
    matches: outputHash === event.outputHash,
    reason: outputHash === event.outputHash ? 'matched' : 'output_hash_mismatch',
  };
}

export async function compareAndStoreSimulationSnapshot(
  input: SimulationCompareInput
): Promise<SimulationSnapshotStoreResult> {
  const previous = await findLatestSimulationSnapshot(
    input.scopeKey,
    SIMULATION_DRIFT_CLASSIFIER_VERSION
  );
  const previousSnapshot = previous === null ? null : previous.snapshot;
  const comparisonOutput = classifySimulationDrift(
    previousSnapshot as Parameters<typeof classifySimulationDrift>[0],
    input.snapshot as Parameters<typeof classifySimulationDrift>[1]
  );
  const outputHash = outputHashFor(comparisonOutput);
  const existing = await findSimulationSnapshotByRun({
    scopeKey: input.scopeKey,
    runId: input.runId,
    classifierVersion: SIMULATION_DRIFT_CLASSIFIER_VERSION,
  });
  if (existing !== null) {
    if (outputHashFor(existing.snapshot) !== outputHashFor(input.snapshot)) {
      throw new SimulationSnapshotIdempotencyConflictError(input.scopeKey, input.runId);
    }
    return {
      snapshot: existing,
      comparisonOutput: existing.comparisonOutput as unknown as SimulationDriftClassification,
      created: false,
    };
  }

  const snapshot = await createSimulationAutomationSnapshotRecord({
    repo: input.repo,
    scopeKey: input.scopeKey,
    runId: input.runId,
    classifierVersion: SIMULATION_DRIFT_CLASSIFIER_VERSION,
    snapshot: input.snapshot,
    comparisonOutput,
    outputHash,
    previousSnapshotId: previous?.id,
  });

  return { snapshot, comparisonOutput, created: true };
}
