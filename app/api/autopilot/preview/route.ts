import { NextRequest, NextResponse } from 'next/server';
import { getAutopilotDecisionForUserSwipe } from '@/lib/autopilot/service';
import { AutopilotPreviewInputSchema, AutopilotServiceError } from '@/lib/autopilot/types';
import { logGuardrailEvent, logInvariantViolation } from '@/lib/log';
import { parseJsonBody } from '@/lib/validation';
import { resolveUserContext } from '@/lib/user-context';

export async function POST(request: NextRequest): Promise<NextResponse> {
  let userId: string | null = null;
  try {
    const userContext = await resolveUserContext({ requireAuth: true, allowLabDemo: true });
    userId = userContext.userId;

    const parsed = await parseJsonBody(request, AutopilotPreviewInputSchema);
    if (!parsed.ok) {
      logGuardrailEvent({
        surface: 'autopilot',
        userId,
        kind: 'INPUT_INVALID',
        severity: 'hard',
        reason: 'INVALID_PAYLOAD',
      });
      return parsed.response;
    }

    const preview = await getAutopilotDecisionForUserSwipe(userContext.userId, parsed.data);

    if (preview.status === 'blocked') {
      logGuardrailEvent({
        surface: 'autopilot',
        userId,
        kind: 'DECISION_BLOCKED',
        severity: 'hard',
        reason: preview.reasonCode,
      });
    }
    if (preview.status === 'fallback') {
      logGuardrailEvent({
        surface: 'autopilot',
        userId,
        kind: 'ENGINE_ERROR',
        severity: 'soft',
        reason: preview.reasonCode,
      });
    }

    return NextResponse.json(preview, { status: 200 });
  } catch (err) {
    if (err instanceof AutopilotServiceError) {
      logGuardrailEvent({
        surface: 'autopilot',
        userId,
        kind: err.status >= 500 ? 'ENGINE_ERROR' : 'INPUT_INVALID',
        severity: err.status >= 500 ? 'soft' : 'hard',
        reason: err.code,
      });
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }

    if (err instanceof Error && err.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    logInvariantViolation({
      surface: 'autopilot',
      detail: 'Autopilot preview failed unexpectedly',
      data: { userId, error: err instanceof Error ? err.message : 'UNKNOWN_ERROR' },
    });
    return NextResponse.json({ error: 'Failed to evaluate autopilot' }, { status: 500 });
  }
}
