import { NextResponse } from 'next/server';
import { resolveUserContext } from '../../../../lib/user-context.js';
import { asAppError, isUnauthorized } from '../../../../lib/errors.js';
import { auth } from '../../../../lib/auth.js';

export async function GET(): Promise<NextResponse> {
  try {
    const ctx = await resolveUserContext({
      getSession: auth,
      requireAuth: true,
      allowLabDemo: true,
    });
    return NextResponse.json({ userId: ctx.userId, mode: ctx.mode });
  } catch (error: unknown) {
    const appError = asAppError(error);
    if (isUnauthorized(appError)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return new NextResponse('Failed to resolve user context', { status: 500 });
  }
}
