import { NextResponse } from 'next/server';
import { resolveUserContext } from '../../../../lib/user-context.js';
import { asError } from '../../../../lib/errors.js';

export async function GET(): Promise<NextResponse> {
  try {
    const ctx = await resolveUserContext({ requireAuth: true, allowLabDemo: true });
    return NextResponse.json({ userId: ctx.userId, mode: ctx.mode });
  } catch (error: unknown) {
    asError(error);
    if (error instanceof Error && error.message.startsWith('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return new NextResponse('Failed to resolve user context', { status: 500 });
  }
}
