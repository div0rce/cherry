import { NextRequest, NextResponse } from 'next/server';
import { commitAutopilotDecision, commitAutopilotDecisionV2 } from '@/lib/autopilot/service';
import { AutopilotCommitInputSchema, AutopilotServiceError } from '@/lib/autopilot/types';
import { logGuardrailEvent, logInvariantViolation } from '@/lib/log';
import { parseJsonBody } from '@/lib/validation';
import { resolveUserContext } from '@/lib/user-context';
import { asError } from '@/lib/errors';

const AUTOPILOT_COMMIT_V2_ENABLED = process.env['AUTOPILOT_COMMIT_V2'] === 'true';

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

    const result = AUTOPILOT_COMMIT_V2_ENABLED
      ? await commitAutopilotDecisionV2(userContext.userId, parsed.data)
      : await commitAutopilotDecision(userContext.userId, parsed.data);

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    asError(err);
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

    if (err.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }
    logInvariantViolation({
      surface: 'autopilot',
      detail: 'Autopilot commit failed unexpectedly',
      data: { userId, error: err.message },
    });
    return NextResponse.json(
      { error: 'Failed to commit swipe', code: 'AUTOPILOT_COMMIT_UNEXPECTED' },
      { status: 500 }
    );
  }
}
