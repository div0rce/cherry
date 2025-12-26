import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { logError } from '../../../../../lib/logger.js';
import { ConfirmSessionSchema } from '../../../../../lib/schemas/sessions.js';
import { parseJsonBody } from '../../../../../lib/validation.js';
import { assertUserId, isPrismaP2003, logInvariant, resolveUserContext } from '../../../../../lib/user-context.js';
import { confirmRecommendationSession, SessionConfirmError } from '../../../../../lib/sessions/confirm-service.js';
import { asError, asLogMeta } from '../../../../../lib/errors.js';

const hasText = (value?: string | null): value is string =>
  value !== undefined && value !== null && value !== '';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  let userId: string | null = null;
  let mode: string | null = null;

  try {
    const ctx = await resolveUserContext({
      requireAuth: true,
      allowLabDemo: false,
    });
    userId = ctx.userId;
    mode = ctx.mode;
  } catch (error) {
    asError(error);
    if (error.message.startsWith('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    logError('Error resolving user context in api/sessions/[id]/confirm POST', error);
    return NextResponse.json({ error: 'Failed to resolve user context' }, { status: 500 });
  }

  try {
    assertUserId(userId, 'api/sessions/[id]/confirm POST');

    const { id } = await params;
    if (!hasText(id)) {
      return NextResponse.json({ error: 'session id is required' }, { status: 400 });
    }

    const parsed = await parseJsonBody(request, ConfirmSessionSchema);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;
    const requestNow = new Date();

    const outcome = await confirmRecommendationSession({
      sessionId: id,
      userId,
      payload: body,
      mode,
      now: requestNow,
    });

    if (outcome.kind === 'insufficient') {
      return NextResponse.json(
        {
          ok: true,
          message: outcome.message,
          sessionStatus: outcome.sessionStatus,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      sessionStatus: outcome.sessionStatus,
      ledgerStatus: outcome.ledgerStatus,
      pointsPending: outcome.pointsPending,
      message: outcome.message,
    });
  } catch (error) {
    asError(error);
    if (error instanceof SessionConfirmError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    if (isPrismaP2003(error)) {
      logInvariant('P2003 in api/sessions/[id]/confirm POST', {
        userId,
        mode,
        meta: asLogMeta(error.meta),
        err: error,
      });
    } else {
      logInvariant('Error in api/sessions/[id]/confirm POST', { userId, mode, err: error });
      logError('Error in /api/sessions/[id]/confirm POST', error);
    }
    return NextResponse.json({ error: 'Failed to confirm session' }, { status: 500 });
  }
}
