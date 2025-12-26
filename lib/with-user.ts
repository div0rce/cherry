import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { resolveUserContext } from './user-context.js';
import { assertUserId } from './invariants.js';

export async function withUser(
  request: NextRequest,
  handler: (userId: string, req: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const { userId } = await resolveUserContext({ requireAuth: true, allowLabDemo: false });
    assertUserId(userId);
    return handler(userId, request);
  } catch {
    return new NextResponse('Unauthorized', { status: 401 });
  }
}
