import { NextRequest, NextResponse } from 'next/server';
import { commitAutopilotDecision } from '@/lib/autopilot/service';
import { AutopilotCommitInputSchema, AutopilotServiceError } from '@/lib/autopilot/types';
import { logGuardrailEvent, logInvariantViolation } from '@/lib/log';
import { parseJsonBody } from '@/lib/validation';
import { resolveUserContext } from '@/lib/user-context';

export async function POST(request: NextRequest): Promise<NextResponse> {
  let userId: string | null = null;
  try {
    const userContext = await resolveUserContext({ requireAuth: true, allowLabDemo: true });
    userId = userContext.userId;

    const parsed = await parseJsonBody(request, AutopilotCommitInputSchema);
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

    const result = await commitAutopilotDecision(userContext.userId, parsed.data);

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    if (err instanceof AutopilotServiceError) {
      const kind =
        err.code === 'DECISION_BLOCKED' || err.code === 'CARD_MISMATCH'
          ? 'DECISION_BLOCKED'
          : err.status >= 500
            ? 'ENGINE_ERROR'
            : 'INPUT_INVALID';
      const severity = kind === 'DECISION_BLOCKED' ? 'hard' : err.status >= 500 ? 'soft' : 'hard';
      logGuardrailEvent({
        surface: 'autopilot',
        userId,
        kind,
        severity,
        reason: err.code,
      });
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }

    if (err instanceof Error && err.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    logInvariantViolation({
      surface: 'autopilot',
      detail: 'Autopilot commit failed unexpectedly',
      data: { userId, error: err instanceof Error ? err.message : 'UNKNOWN_ERROR' },
    });
    return NextResponse.json({ error: 'Failed to commit swipe' }, { status: 500 });
  }
}
