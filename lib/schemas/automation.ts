import { z } from 'zod';

export const AutomationSourceSchema = z.enum(['github', 'openclaw', 'cherry', 'manual']);

export const AutomationNormalizedEventSchema = z
  .object({
    event: z.string().min(1),
    source: AutomationSourceSchema,
    repo: z.string().min(1),
    timestamp: z.string().min(1),
    payload: z.unknown(),
  })
  .strict();

export const AutomationFileChangeSchema = z
  .object({
    filename: z.string().min(1),
    status: z.string().min(1).optional(),
    additions: z.number().int().nonnegative().optional(),
    deletions: z.number().int().nonnegative().optional(),
    changes: z.number().int().nonnegative().optional(),
    patch: z.string().optional(),
  })
  .strict();

export const AutomationEventIngestSchema = z
  .object({
    repo: z.string().min(1),
    sha: z.string().min(1).optional(),
    event: z.string().min(1),
    source: AutomationSourceSchema,
    workflow: z.string().min(1),
    status: z.string().min(1).default('accepted'),
    idempotencyKey: z.string().min(1),
    classifierVersion: z.string().min(1),
    rawPayload: z.unknown(),
    normalizedEvent: AutomationNormalizedEventSchema,
    classifierOutput: z.unknown(),
    prNumber: z.number().int().positive().optional(),
    issueNumber: z.number().int().positive().optional(),
  })
  .strict();

export const PrAutomationClassifySchema = z
  .object({
    repo: z.string().min(1),
    sha: z.string().min(1),
    prNumber: z.number().int().positive(),
    title: z.string(),
    body: z.string().nullable().optional(),
    labels: z.array(z.string()).default([]),
    files: z.array(AutomationFileChangeSchema).default([]),
    sourceWorkflow: z.string().min(1).default('unknown'),
    eventId: z.string().min(1).optional(),
  })
  .strict();

export const SimulationSnapshotCompareSchema = z
  .object({
    repo: z.string().min(1),
    scopeKey: z.string().min(1),
    runId: z.string().min(1),
    snapshot: z.unknown(),
    sourceWorkflow: z.string().min(1).default('unknown'),
  })
  .strict();

export const GithubStatusContextSchema = z.enum([
  'cherry/forbidden-change',
  'cherry/docs-drift',
  'cherry/risk-gate',
  'cherry/openclaw-policy',
]);

export const GithubStatusStateSchema = z.enum(['error', 'failure', 'pending', 'success']);

export const GithubStatusPostSchema = z
  .object({
    repo: z.string().min(1),
    sha: z.string().min(1),
    context: GithubStatusContextSchema,
    state: GithubStatusStateSchema,
    description: z.string().min(1).max(140),
    targetUrl: z.string().url().optional(),
    sourceWorkflow: z.string().min(1),
    automationEventId: z.string().min(1).optional(),
    classifierVersion: z.string().min(1),
    outputHash: z.string().min(1),
  })
  .strict();

export const GithubStatusRetrySchema = z
  .union([
    z
      .object({
        id: z.string().min(1),
        statusIdempotencyKey: z.never().optional(),
      })
      .strict(),
    z
      .object({
        id: z.never().optional(),
        statusIdempotencyKey: z.string().min(1),
      })
      .strict(),
  ]);

export const AutomationReplaySchema = z
  .object({
    automationEventId: z.string().min(1),
    classifierVersion: z.string().min(1),
  })
  .strict();
