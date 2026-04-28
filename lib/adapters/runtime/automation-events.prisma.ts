import type { AutomationEvent, Prisma, SimulationAutomationSnapshot } from '@prisma/client';
import { prisma } from '../../prisma.js';

export type CreateAutomationEventRecordInput = {
  repo: string;
  sha?: string | undefined;
  event: string;
  source: string;
  workflow: string;
  status: string;
  idempotencyKey: string;
  classifierVersion: string;
  outputHash: string;
  rawPayload: unknown;
  normalizedEvent: unknown;
  classifierOutput: unknown;
  prNumber?: number | undefined;
  issueNumber?: number | undefined;
};

export type CreateSimulationAutomationSnapshotRecordInput = {
  repo: string;
  scopeKey: string;
  runId: string;
  classifierVersion: string;
  snapshot: unknown;
  comparisonOutput: unknown;
  outputHash: string;
  previousSnapshotId?: string | undefined;
};

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export async function findAutomationEventByIdempotencyKey(
  idempotencyKey: string
): Promise<AutomationEvent | null> {
  return prisma.automationEvent.findUnique({ where: { idempotencyKey } });
}

export async function findAutomationEventById(id: string): Promise<AutomationEvent | null> {
  return prisma.automationEvent.findUnique({ where: { id } });
}

export async function createAutomationEventRecord(
  input: CreateAutomationEventRecordInput
): Promise<AutomationEvent> {
  const data: Prisma.AutomationEventUncheckedCreateInput = {
    repo: input.repo,
    event: input.event,
    source: input.source,
    workflow: input.workflow,
    status: input.status,
    idempotencyKey: input.idempotencyKey,
    classifierVersion: input.classifierVersion,
    outputHash: input.outputHash,
    rawPayload: asJson(input.rawPayload),
    normalizedEvent: asJson(input.normalizedEvent),
    classifierOutput: asJson(input.classifierOutput),
  };
  if (input.sha !== undefined) data.sha = input.sha;
  if (input.prNumber !== undefined) data.prNumber = input.prNumber;
  if (input.issueNumber !== undefined) data.issueNumber = input.issueNumber;

  return prisma.automationEvent.create({ data });
}

export async function findLatestSimulationSnapshot(
  scopeKey: string,
  classifierVersion: string
): Promise<SimulationAutomationSnapshot | null> {
  return prisma.simulationAutomationSnapshot.findFirst({
    where: { scopeKey, classifierVersion },
    orderBy: { createdAt: 'desc' },
  });
}

export async function findSimulationSnapshotByRun(input: {
  scopeKey: string;
  runId: string;
  classifierVersion: string;
}): Promise<SimulationAutomationSnapshot | null> {
  return prisma.simulationAutomationSnapshot.findUnique({
    where: {
      scopeKey_runId_classifierVersion: {
        scopeKey: input.scopeKey,
        runId: input.runId,
        classifierVersion: input.classifierVersion,
      },
    },
  });
}

export async function createSimulationAutomationSnapshotRecord(
  input: CreateSimulationAutomationSnapshotRecordInput
): Promise<SimulationAutomationSnapshot> {
  const data: Prisma.SimulationAutomationSnapshotUncheckedCreateInput = {
    repo: input.repo,
    scopeKey: input.scopeKey,
    runId: input.runId,
    classifierVersion: input.classifierVersion,
    snapshot: asJson(input.snapshot),
    comparisonOutput: asJson(input.comparisonOutput),
    outputHash: input.outputHash,
  };
  if (input.previousSnapshotId !== undefined) {
    data.previousSnapshotId = input.previousSnapshotId;
  }

  return prisma.simulationAutomationSnapshot.create({ data });
}
