import { NextResponse } from 'next/server';
import { resolveUserContext } from '../../../../lib/user-context';
import { asAppError, isUnauthorized } from '../../../../lib/errors';

export async function GET(): Promise<NextResponse> {
  try {
    const ctx = await resolveUserContext({ requireAuth: true, allowLabDemo: true });
    return NextResponse.json({ userId: ctx.userId, mode: ctx.mode });
  } catch (error: unknown) {
    const appError = asAppError(error);
    if (isUnauthorized(appError)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return new NextResponse('Failed to resolve user context', { status: 500 });
  }
}
