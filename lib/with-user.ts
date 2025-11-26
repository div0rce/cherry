import { NextResponse } from 'next/server';
import { getUserIdFromSession } from './auth';

export async function withUser(
  request: Request,
  handler: (userId: string, req: Request) => Promise<NextResponse> | NextResponse
): Promise<NextResponse> {
  const userId = await getUserIdFromSession();
  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  return handler(userId, request);
}
