import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from './auth.js';
import { resolveUserContext } from './user-context.js';
import { assertUserId } from './invariants.js';

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
