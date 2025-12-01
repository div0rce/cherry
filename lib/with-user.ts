import { NextResponse } from 'next/server';
import { resolveUserContext } from '@/lib/user-context';
import { assertUserId } from '@/lib/invariants';

export async function withUser(
  request: Request,
  handler: (userId: string, req: Request) => Promise<NextResponse> | NextResponse
): Promise<NextResponse> {
  try {
    const { userId } = await resolveUserContext({ requireAuth: true, allowLabDemo: false });
    assertUserId(userId);
    return handler(userId, request);
  } catch {
    return new NextResponse('Unauthorized', { status: 401 });
  }
}
