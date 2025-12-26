import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { logError } from '../../../../../lib/logger.js';
import { VerifySessionSchema } from '../../../../../lib/schemas/sessions.js';
import { parseJsonBody } from '../../../../../lib/validation.js';
import {
  assertUserId,
  logInvariant,
  resolveUserContext,
} from '../../../../../lib/user-context.js';
import { verifySessionFromSignal } from '../../../../../lib/verification/verify-session.js';
import { asError } from '../../../../../lib/errors.js';

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
    logError('Error resolving user context in api/sessions/[id]/verify POST', error);
    return NextResponse.json({ error: 'Failed to resolve user context' }, { status: 500 });
  }

  try {
    assertUserId(userId, 'api/sessions/[id]/verify POST');

    const { id } = await params;
    if (!hasText(id)) {
      return NextResponse.json({ error: 'session id is required' }, { status: 400 });
    }

    const parsed = await parseJsonBody(request, VerifySessionSchema);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;

    const result = await verifySessionFromSignal({
      sessionId: id,
      userId,
      source: 'MANUAL',
      verified: body.verified,
      occurredAt: new Date(),
    });

    if (!result.ok) {
      if (result.reason === 'NOT_FOUND') {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
      if (result.reason === 'FINALIZED') {
        return NextResponse.json(
          { error: 'Session already finalized', sessionStatus: result.sessionStatus },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: result.message ?? result.reason }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      sessionStatus: result.sessionStatus,
      ledgerStatus: result.ledgerStatus,
    });
  } catch (error) {
    asError(error);
    logInvariant('Error in api/sessions/[id]/verify POST', { userId, mode, err: error });
    logError('Error in /api/sessions/[id]/verify', error);
    return NextResponse.json({ error: 'Failed to verify session' }, { status: 500 });
  }
}
