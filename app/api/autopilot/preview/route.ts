import { NextRequest, NextResponse } from 'next/server';
import { getAutopilotPreview } from '@/lib/autopilot/service';
import { AutopilotServiceError } from '@/lib/autopilot/types';
import { logGuardrailEvent, logInvariantViolation } from '@/lib/log';
import type { AutopilotPreviewEngineContext } from '@/lib/autopilot/service';
import {
  AutopilotPreviewInputSchema,
  AutopilotPreviewOutputSchema,
} from '@/lib/validation/autopilot/preview';
import { resolveUserContext } from '@/lib/user-context';
import { incrementCounter, observeDuration } from '@/lib/metrics/autopilot';
import { parseJsonBody } from '@/lib/validation';

// Contract: /api/autopilot/preview is stateless, engine-backed, and validated by AutopilotPreview*Schema (see docs/autopilot-master-spec.md).

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startedAt = Date.now();
  let userId: string | null = null;
  let previewStatusLabel: 'ok' | 'blocked' | 'fallback' | 'invalid' | 'none' = 'none';

  const respond = (status: number, body: Record<string, unknown>): NextResponse => {
    const durationMs = Date.now() - startedAt;
    incrementCounter('autopilot_preview_requests_total', {
      http_status: status,
      preview_status: previewStatusLabel,
    });
    observeDuration('autopilot_preview_route_ms', durationMs, { http_status: status });
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
      });
      return respond(400, { error: 'Invalid payload', code: 'INVALID_PAYLOAD' });
    }

    const normalizedInput: AutopilotPreviewEngineContext = {
      ...parsedInput.data,
      occurredAt: parsedInput.data.occurredAt ?? new Date().toISOString(),
    };

    const preview = await getAutopilotPreview(userContext.userId, normalizedInput);
    const validatedPreview = AutopilotPreviewOutputSchema.safeParse(preview);
    if (!validatedPreview.success) {
      previewStatusLabel = 'invalid';
      logInvariantViolation({
        surface: 'autopilot',
        detail: 'Autopilot preview response failed validation at route',
        data: {
          reason: 'PREVIEW_OUTPUT_SCHEMA_MISMATCH',
          status: preview?.status ?? 'unknown',
          reasonCode: preview?.reasonCode,
          issues: validatedPreview.error.format(),
        },
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
      });
    }
    if (validatedPreview.data.status === 'fallback') {
      logGuardrailEvent({
        surface: 'autopilot',
        userId,
        kind: 'ENGINE_ERROR',
        severity: 'soft',
        reason: validatedPreview.data.reasonCode,
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
  } catch (err) {
    if (err instanceof AutopilotServiceError) {
      previewStatusLabel = 'invalid';
      logGuardrailEvent({
        surface: 'autopilot',
        userId,
        kind: err.status >= 500 ? 'ENGINE_ERROR' : 'INPUT_INVALID',
        severity: err.status >= 500 ? 'soft' : 'hard',
        reason: err.code,
      });
      return respond(err.status, { error: err.message, code: err.code });
    }

    if (err instanceof Error && err.message.includes('Unauthorized')) {
      previewStatusLabel = 'invalid';
      return respond(401, { error: 'Unauthorized', code: 'UNAUTHORIZED' });
    }
    previewStatusLabel = 'invalid';
    logInvariantViolation({
      surface: 'autopilot',
      detail: 'Autopilot preview failed unexpectedly',
      data: { userId, error: err instanceof Error ? err.message : 'UNKNOWN_ERROR' },
    });
    return respond(500, { error: 'Failed to evaluate autopilot', code: 'PREVIEW_UNEXPECTED_ERROR' });
  }
}
