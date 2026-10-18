import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { z } from 'zod';
import { getAutopilotPreview } from '../../../../lib/autopilot/service.js';
import { AutopilotServiceError } from '../../../../lib/autopilot/types.js';
import { logGuardrailEvent, logInvariantViolation } from '../../../../lib/log.js';
import type { AutopilotPreviewEngineContext } from '../../../../lib/autopilot/service.js';
import {
  AutopilotPreviewInputSchema,
  AutopilotPreviewOutputSchema,
} from '../../../../lib/validation/autopilot/preview.js';
import { resolveUserContext } from '../../../../lib/user-context.js';
import { incrementCounter, observeDuration } from '../../../../lib/metrics/autopilot.js';
import { parseJsonBody } from '../../../../lib/validation.js';
import { buildPrismaWorld } from '../../../../lib/adapters/runtime/world.prisma.js';
import { asAppError, isUnauthorized } from '../../../../lib/errors.js';
import { auth } from '../../../../lib/auth.js';

// Contract: /api/autopilot/preview is stateless, engine-backed, and validated by AutopilotPreview*Schema (see docs/autopilot-master-spec.md).

type PreviewOutput = z.infer<typeof AutopilotPreviewOutputSchema>;

function logOutputMismatch(
  preview: Awaited<ReturnType<typeof getAutopilotPreview>> | null | undefined,
  error: z.ZodError,
  timestamp: string
): void {
  logInvariantViolation({
    surface: 'autopilot',
    detail: 'Autopilot preview response failed validation at endpoint',
    data: {
      reason: 'PREVIEW_OUTPUT_SCHEMA_MISMATCH',
      status: preview?.status ?? 'unknown',
      reasonCode: preview?.reasonCode,
      issues: error.format(),
    },
    timestamp,
  });
}

const STATUS_EVENTS = {
  blocked: { kind: 'DECISION_BLOCKED', severity: 'hard' },
  fallback: { kind: 'ENGINE_ERROR', severity: 'soft' },
} as const;

function logPreviewStatus(data: PreviewOutput, userId: string, timestamp: string): void {
  if (data.status !== 'blocked' && data.status !== 'fallback') return;
  logGuardrailEvent({
    surface: 'autopilot',
    userId,
    ...STATUS_EVENTS[data.status],
    reason: data.reasonCode,
    timestamp,
    timestampSource: 'boundary',
  });
}

function bucketPressure(remainingCents: number | null | undefined): 'exhausted' | 'ok' {
  if (remainingCents == null) return 'ok';
  return remainingCents <= 0 ? 'exhausted' : 'ok';
}

function recordPreviewCounters(data: PreviewOutput): void {
  incrementCounter('autopilot_preview_bucket_pressure_total', {
    pressure: bucketPressure(data.bucketImpact?.remainingCents),
  });
  incrementCounter('autopilot_preview_has_warnings_total', {
    has_warnings: data.ui.explanation.warnings.length > 0 ? 'yes' : 'no',
  });
}

function logServiceError(caught: AutopilotServiceError, userId: string | null, timestamp: string): void {
  const serverSide = caught.status >= 500;
  logGuardrailEvent({
    surface: 'autopilot',
    userId,
    kind: serverSide ? 'ENGINE_ERROR' : 'INPUT_INVALID',
    severity: serverSide ? 'soft' : 'hard',
    reason: caught.code,
    timestamp,
    timestampSource: 'boundary',
  });
}

function previewFailure(
  caught: unknown,
  userId: string | null,
  timestamp: string
): { status: number; body: Record<string, unknown> } {
  const appError = asAppError(caught);
  if (caught instanceof AutopilotServiceError) {
    logServiceError(caught, userId, timestamp);
    return { status: caught.status, body: { error: appError.message, code: caught.code } };
  }
  if (isUnauthorized(appError)) {
    return { status: 401, body: { error: 'Unauthorized', code: 'UNAUTHORIZED' } };
  }
  logInvariantViolation({
    surface: 'autopilot',
    detail: 'Autopilot preview failed unexpectedly',
    data: { userId, error: appError.message },
    timestamp,
  });
  return { status: 500, body: { error: 'Failed to evaluate autopilot', code: 'PREVIEW_UNEXPECTED_ERROR' } };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestStartedAt = new Date();
  const requestStartedMs = requestStartedAt.getTime();
  const requestTimestamp = requestStartedAt.toISOString();
  let userId: string | null = null;
  let previewStatusLabel: 'ok' | 'blocked' | 'fallback' | 'invalid' | 'none' = 'none';

  const respond = (status: number, body: Record<string, unknown>): NextResponse => {
    const durationMs = new Date().getTime() - requestStartedMs;
    incrementCounter('autopilot_preview_requests_total', {
      http_status: status,
      preview_status: previewStatusLabel,
    });
    observeDuration('autopilot_preview_endpoint_ms', durationMs, { http_status: status });
    return NextResponse.json(body, { status });
  };

  try {
    const userContext = await resolveUserContext({
      getSession: auth,
      requireAuth: true,
      allowLabDemo: true,
    });
    userId = userContext.userId;

    const parsedInput = await parseJsonBody(request, AutopilotPreviewInputSchema);
    if (parsedInput.ok !== true) {
      previewStatusLabel = 'invalid';
      logGuardrailEvent({
        surface: 'autopilot',
        userId,
        kind: 'INPUT_INVALID',
        severity: 'hard',
        reason: 'INVALID_PAYLOAD',
        timestamp: requestTimestamp,
        timestampSource: 'boundary',
      });
      return respond(400, { error: 'Invalid payload', code: 'INVALID_PAYLOAD' });
    }

    const normalizedInput: AutopilotPreviewEngineContext = {
      ...parsedInput.data,
      occurredAt: parsedInput.data.occurredAt ?? requestStartedAt.toISOString(),
    };

    const world = buildPrismaWorld();
    const preview = await getAutopilotPreview(world, userContext.userId, normalizedInput, {
      now: requestStartedAt,
    });
    const validatedPreview = AutopilotPreviewOutputSchema.safeParse(preview);
    if (!validatedPreview.success) {
      previewStatusLabel = 'invalid';
      logOutputMismatch(preview, validatedPreview.error, requestTimestamp);
      return respond(500, { error: 'Failed to evaluate autopilot', code: 'PREVIEW_UNEXPECTED_ERROR' });
    }

    previewStatusLabel = validatedPreview.data.status;

    logPreviewStatus(validatedPreview.data, userId, requestTimestamp);
    recordPreviewCounters(validatedPreview.data);

    return respond(200, validatedPreview.data);
  } catch (caught: unknown) {
    previewStatusLabel = 'invalid';
    const failure = previewFailure(caught, userId, requestTimestamp);
    return respond(failure.status, failure.body);
  }
}
