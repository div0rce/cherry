import * as assert from 'node:assert/strict';
import { Prisma, PrismaClient } from '@prisma/client';
import { assertPrismaError, getPrismaMetaString } from '../_helpers/assert-prisma-error.js';

const prisma = new PrismaClient();

const NOT_NULL_CONSTRAINTS = [
  'NOT_NULL:071a671b50fb',
  'NOT_NULL:2856ae778f57',
  'NOT_NULL:2e723dd620a6',
  'NOT_NULL:342ac63ad189',
  'NOT_NULL:3758a6585230',
  'NOT_NULL:3ca21e9e45fa',
  'NOT_NULL:3dd52344230b',
  'NOT_NULL:4b10446b95e1',
  'NOT_NULL:4b7e6023b536',
  'NOT_NULL:568026ae010c',
  'NOT_NULL:68a2d5554b15',
  'NOT_NULL:6e030f061140',
  'NOT_NULL:7043c0f5255c',
  'NOT_NULL:776f09fbc5b2',
  'NOT_NULL:77c1392dba1e',
  'NOT_NULL:7996bef994a5',
  'NOT_NULL:7c4f17d2d641',
  'NOT_NULL:8005bfc46cf5',
  'NOT_NULL:8206bfbc595b',
  'NOT_NULL:82c4da434472',
  'NOT_NULL:87fa7b2f34a3',
  'NOT_NULL:90ad611dd8fd',
  'NOT_NULL:a4b229badf88',
  'NOT_NULL:afd6dd8e0c16',
  'NOT_NULL:b326784ec024',
  'NOT_NULL:c2c63cfc4045',
  'NOT_NULL:cd4cdd4ace1b',
  'NOT_NULL:cfb682211961',
  'NOT_NULL:d749fe9b04a7',
  'NOT_NULL:db294d632a8c',
  'NOT_NULL:dc9bd959f232',
  'NOT_NULL:df2cb8c868b2',
  'NOT_NULL:ef57d03df80f',
  'NOT_NULL:f7ff64432e48',
] as const;

const UNIQUE_CONSTRAINTS = [
  'automation_event__idempotency_key__unique',
  'automation_status_check__status_idempotency_key__unique',
  'simulation_automation_snapshot__scope_run_version__unique',
] as const;

void NOT_NULL_CONSTRAINTS;
void UNIQUE_CONSTRAINTS;

type TableSpec = {
  table: string;
  columns: string[];
  jsonColumns: Set<string>;
  baseRow: (suffix: string) => Record<string, unknown>;
};

const at = new Date('2024-01-01T00:00:00Z');

const tableSpecs: TableSpec[] = [
  {
    table: 'AutomationEvent',
    columns: [
      'id',
      'repo',
      'event',
      'source',
      'workflow',
      'status',
      'idempotencyKey',
      'classifierVersion',
      'outputHash',
      'rawPayload',
      'normalizedEvent',
      'classifierOutput',
      'createdAt',
      'updatedAt',
    ],
    jsonColumns: new Set(['rawPayload', 'normalizedEvent', 'classifierOutput']),
    baseRow: (suffix) => ({
      id: `automation-event-required-${suffix}`,
      repo: 'div0rce/cherry',
      event: 'db.constraint',
      source: 'manual',
      workflow: 'db-test',
      status: 'accepted',
      idempotencyKey: `automation-event-required-${suffix}`,
      classifierVersion: 'automation_v2',
      outputHash: `hash-${suffix}`,
      rawPayload: JSON.stringify({ suffix }),
      normalizedEvent: JSON.stringify({ suffix }),
      classifierOutput: JSON.stringify({ suffix }),
      createdAt: at,
      updatedAt: at,
    }),
  },
  {
    table: 'SimulationAutomationSnapshot',
    columns: [
      'id',
      'repo',
      'scopeKey',
      'runId',
      'classifierVersion',
      'snapshot',
      'comparisonOutput',
      'outputHash',
      'createdAt',
    ],
    jsonColumns: new Set(['snapshot', 'comparisonOutput']),
    baseRow: (suffix) => ({
      id: `simulation-automation-snapshot-required-${suffix}`,
      repo: 'div0rce/cherry',
      scopeKey: `scope-${suffix}`,
      runId: `run-${suffix}`,
      classifierVersion: 'automation_v2',
      snapshot: JSON.stringify({ suffix }),
      comparisonOutput: JSON.stringify({ suffix }),
      outputHash: `hash-${suffix}`,
      createdAt: at,
    }),
  },
  {
    table: 'AutomationStatusCheck',
    columns: [
      'id',
      'repo',
      'sha',
      'context',
      'state',
      'description',
      'sourceWorkflow',
      'classifierVersion',
      'outputHash',
      'statusIdempotencyKey',
      'createdAt',
    ],
    jsonColumns: new Set(),
    baseRow: (suffix) => ({
      id: `automation-status-check-required-${suffix}`,
      repo: 'div0rce/cherry',
      sha: `sha-${suffix}`,
      context: 'cherry/risk-gate',
      state: 'success',
      description: 'DB constraint check',
      sourceWorkflow: 'db-test',
      classifierVersion: 'automation_v2',
      outputHash: `hash-${suffix}`,
      statusIdempotencyKey: `automation-status-check-required-${suffix}`,
      createdAt: at,
    }),
  },
];

async function insertRaw(spec: TableSpec, row: Record<string, unknown>): Promise<void> {
  const columns = spec.columns.map((column) => `"${column}"`).join(', ');
  const placeholders = spec.columns
    .map((column, index) => `$${index + 1}${spec.jsonColumns.has(column) ? '::jsonb' : ''}`)
    .join(', ');
  const values = spec.columns.map((column) => row[column]);
  await prisma.$executeRawUnsafe(
    `INSERT INTO "${spec.table}" (${columns}) VALUES (${placeholders})`,
    ...values
  );
}

function assertRawSqlCode(error: unknown, expected: '23502'): void {
  assertPrismaError(error);
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    assert.equal(error.code, 'P2010', 'expected raw query failure');
    const code = getPrismaMetaString(error, 'code');
    if (code !== undefined) {
      assert.equal(code, expected);
      return;
    }
  }

  assert.ok(String(error).includes(expected), `expected SQLSTATE ${expected}`);
}

function assertUniqueError(error: unknown): void {
  assertPrismaError(error);
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    assert.equal(error.code, 'P2002', 'expected unique constraint violation');
    return;
  }
  throw new Error(`Expected PrismaClientKnownRequestError, got ${String(error)}`);
}

async function expectNotNullViolation(spec: TableSpec, column: string): Promise<void> {
  let error: unknown = null;
  try {
    await insertRaw(spec, {
      ...spec.baseRow(column),
      [column]: null,
    });
  } catch (err) {
    error = err;
  }

  if (error === null) {
    throw new Error(`Expected NOT NULL violation on ${spec.table}.${column}`);
  }
  assertRawSqlCode(error, '23502');
}

async function expectUniqueViolations(): Promise<void> {
  await prisma.automationEvent.create({
    data: {
      repo: 'div0rce/cherry',
      event: 'db.constraint',
      source: 'manual',
      workflow: 'db-test',
      status: 'accepted',
      idempotencyKey: 'automation-event-unique-key',
      classifierVersion: 'automation_v2',
      outputHash: 'hash-event',
      rawPayload: {},
      normalizedEvent: {},
      classifierOutput: {},
    },
  });

  let eventError: unknown = null;
  try {
    await prisma.automationEvent.create({
      data: {
        repo: 'div0rce/cherry',
        event: 'db.constraint',
        source: 'manual',
        workflow: 'db-test',
        status: 'accepted',
        idempotencyKey: 'automation-event-unique-key',
        classifierVersion: 'automation_v2',
        outputHash: 'hash-event-duplicate',
        rawPayload: {},
        normalizedEvent: {},
        classifierOutput: {},
      },
    });
  } catch (err) {
    eventError = err;
  }
  if (eventError === null) {
    throw new Error('Expected unique violation on AutomationEvent.idempotencyKey');
  }
  assertUniqueError(eventError);

  await prisma.simulationAutomationSnapshot.create({
    data: {
      repo: 'div0rce/cherry',
      scopeKey: 'scope-unique',
      runId: 'run-unique',
      classifierVersion: 'automation_v2',
      snapshot: {},
      comparisonOutput: {},
      outputHash: 'hash-snapshot',
    },
  });

  let snapshotError: unknown = null;
  try {
    await prisma.simulationAutomationSnapshot.create({
      data: {
        repo: 'div0rce/cherry',
        scopeKey: 'scope-unique',
        runId: 'run-unique',
        classifierVersion: 'automation_v2',
        snapshot: {},
        comparisonOutput: {},
        outputHash: 'hash-snapshot-duplicate',
      },
    });
  } catch (err) {
    snapshotError = err;
  }
  if (snapshotError === null) {
    throw new Error('Expected unique violation on SimulationAutomationSnapshot scope/run/version');
  }
  assertUniqueError(snapshotError);

  await prisma.automationStatusCheck.create({
    data: {
      repo: 'div0rce/cherry',
      sha: 'sha-unique',
      context: 'cherry/risk-gate',
      state: 'success',
      description: 'DB constraint check',
      sourceWorkflow: 'db-test',
      classifierVersion: 'automation_v2',
      outputHash: 'hash-status',
      statusIdempotencyKey: 'automation-status-unique-key',
    },
  });

  let statusError: unknown = null;
  try {
    await prisma.automationStatusCheck.create({
      data: {
        repo: 'div0rce/cherry',
        sha: 'sha-unique-duplicate',
        context: 'cherry/risk-gate',
        state: 'success',
        description: 'DB constraint check',
        sourceWorkflow: 'db-test',
        classifierVersion: 'automation_v2',
        outputHash: 'hash-status-duplicate',
        statusIdempotencyKey: 'automation-status-unique-key',
      },
    });
  } catch (err) {
    statusError = err;
  }
  if (statusError === null) {
    throw new Error('Expected unique violation on AutomationStatusCheck.statusIdempotencyKey');
  }
  assertUniqueError(statusError);
}

async function cleanup(): Promise<void> {
  await prisma.automationStatusCheck.deleteMany({
    where: { sourceWorkflow: 'db-test' },
  });
  await prisma.simulationAutomationSnapshot.deleteMany({
    where: { repo: 'div0rce/cherry', classifierVersion: 'automation_v2' },
  });
  await prisma.automationEvent.deleteMany({
    where: { workflow: 'db-test' },
  });
}

async function run(): Promise<void> {
  try {
    await cleanup();
    for (const spec of tableSpecs) {
      for (const column of spec.columns) {
        await expectNotNullViolation(spec, column);
      }
    }
    await expectUniqueViolations();
    console.warn('db-constraints-automation: ok');
  } finally {
    await cleanup();
    await prisma.$disconnect();
  }
}

run().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
