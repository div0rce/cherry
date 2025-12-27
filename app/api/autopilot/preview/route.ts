import { NextRequest, NextResponse } from 'next/server';
import { getAutopilotPreview } from '../../../../lib/autopilot/service';
import { AutopilotServiceError } from '../../../../lib/autopilot/types';
import { logGuardrailEvent, logInvariantViolation } from '../../../../lib/log';
import type { AutopilotPreviewEngineContext } from '../../../../lib/autopilot/service';
import {
  AutopilotPreviewInputSchema,
  AutopilotPreviewOutputSchema,
} from '../../../../lib/validation/autopilot/preview';
import { resolveUserContext } from '../../../../lib/user-context';
import { incrementCounter, observeDuration } from '../../../../lib/metrics/autopilot';
import { parseJsonBody } from '../../../../lib/validation';
import { buildPrismaWorld } from '../../../../lib/adapters/runtime/world.prisma';
import { asAppError, isUnauthorized } from '../../../../lib/errors';

// Contract: /api/autopilot/preview is stateless, engine-backed, and validated by AutopilotPreview*Schema (see docs/autopilot-master-spec.md).

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
    const userContext = await resolveUserContext({ requireAuth: true, allowLabDemo: true });
    userId = userContext.userId;

    const parsedInput = await parseJsonBody(request, AutopilotPreviewInputSchema);
    if (!parsedInput.ok) {
      previewStatusLabel = 'invalid';
      logGuardrailEvent({
        surface: 'autopilot',
        userId,
        kind: 'INPUT_INVALID',
        severity: 'hard',
        reason: 'INVALID_PAYLOAD',
        timestamp: requestTimestamp,
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
      logInvariantViolation({
        surface: 'autopilot',
        detail: 'Autopilot preview response failed validation at endpoint',
        data: {
          reason: 'PREVIEW_OUTPUT_SCHEMA_MISMATCH',
          status: preview?.status ?? 'unknown',
          reasonCode: preview?.reasonCode,
          issues: validatedPreview.error.format(),
        },
        timestamp: requestTimestamp,
      });
      return respond(500, { error: 'Failed to evaluate autopilot', code: 'PREVIEW_UNEXPECTED_ERROR' });
    }

    previewStatusLabel = validatedPreview.data.status;

    if (validatedPreview.data.status === 'blocked') {
      logGuardrailEvent({
        surface: 'autopilot',
        userId,
        kind: 'DECISION_BLOCKED',
        severity: 'hard',
        reason: validatedPreview.data.reasonCode,
        timestamp: requestTimestamp,
      });
    }
    if (validatedPreview.data.status === 'fallback') {
      logGuardrailEvent({
        surface: 'autopilot',
        userId,
        kind: 'ENGINE_ERROR',
        severity: 'soft',
        reason: validatedPreview.data.reasonCode,
        timestamp: requestTimestamp,
      });
    }

    const remainingCents = validatedPreview.data.bucketImpact?.remainingCents;
    incrementCounter('autopilot_preview_bucket_pressure_total', {
      pressure: remainingCents != null && remainingCents <= 0 ? 'exhausted' : 'ok',
    });
    incrementCounter('autopilot_preview_has_warnings_total', {
      has_warnings: validatedPreview.data.ui.explanation.warnings.length > 0 ? 'yes' : 'no',
    });

    return respond(200, validatedPreview.data);
  } catch (caught: unknown) {
    const appError = asAppError(caught);
    if (caught instanceof AutopilotServiceError) {
      previewStatusLabel = 'invalid';
      logGuardrailEvent({
        surface: 'autopilot',
        userId,
        kind: caught.status >= 500 ? 'ENGINE_ERROR' : 'INPUT_INVALID',
        severity: caught.status >= 500 ? 'soft' : 'hard',
        reason: caught.code,
        timestamp: requestTimestamp,
      });
      return respond(caught.status, { error: appError.message, code: caught.code });
    }

    if (isUnauthorized(appError)) {
      previewStatusLabel = 'invalid';
      return respond(401, { error: 'Unauthorized', code: 'UNAUTHORIZED' });
    }
    previewStatusLabel = 'invalid';
    logInvariantViolation({
      surface: 'autopilot',
      detail: 'Autopilot preview failed unexpectedly',
      data: { userId, error: appError.message },
      timestamp: requestTimestamp,
    });
    return respond(500, { error: 'Failed to evaluate autopilot', code: 'PREVIEW_UNEXPECTED_ERROR' });
  }
}
