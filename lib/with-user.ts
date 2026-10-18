import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from './auth.js';
import { resolveUserContext } from './user-context.js';
import { assertUserId } from './invariants.js';
import { asAppError, isUnauthorized } from './errors.js';

export async function withUser(
  request: NextRequest,
  handler: (userId: string, req: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const { userId } = await resolveUserContext({
      requireAuth: true,
      allowLabDemo: false,
      getSession: auth,
    });
    assertUserId(userId);
    return handler(userId, request);
  } catch (error: unknown) {
    void error;
    return new NextResponse('Unauthorized', { status: 401 });
  }
}

// For routes that call resolveUserContext directly: an UNAUTHORIZED AppError becomes 401 instead
// of escaping the handler as a 500. Anything else is rethrown unchanged.
export function withAuthErrors<A extends unknown[]>(
  handler: (...args: A) => Promise<NextResponse>
): (...args: A) => Promise<NextResponse> {
  return async (...args: A): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error: unknown) {
      if (isUnauthorized(asAppError(error))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      throw error;
    }
  };
}
