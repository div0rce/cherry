import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/logger';
import { asError, asLogMeta } from '@/lib/errors';
import {
  assertUserId,
  isPrismaP2003,
  logInvariant,
  resolveUserContext,
} from '@/lib/user-context';

/**
 * DELETE /api/buckets/[bucketId]
 *
 * Validates ownership (demo user) and deletes the bucket.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ bucketId: string }> }
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
    logError('Error resolving user context in api/buckets/[bucketId] DELETE', error);
    return new NextResponse('Failed to resolve user context', { status: 500 });
  }

  const { bucketId } = await params;

  if (
    bucketId === undefined ||
    bucketId === null ||
    typeof bucketId !== 'string' ||
    bucketId === ''
  ) {
    return new NextResponse('bucketId is required', { status: 400 });
  }

  const bucket = await prisma.bucket.findFirst({
    where: { id: bucketId, userId },
  });
  if (!bucket) {
    return new NextResponse('Bucket not found for user', { status: 404 });
  }

  try {
    assertUserId(userId, 'api/buckets/[bucketId] DELETE');
    await prisma.bucket.deleteMany({
      where: { id: bucket.id, userId },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    asError(error);
    if (isPrismaP2003(error)) {
      logInvariant('P2003 in api/buckets/[bucketId] DELETE', {
        userId,
        mode,
        meta: asLogMeta(error.meta),
        err: error,
      });
    } else {
      logInvariant('Error in api/buckets/[bucketId] DELETE', { userId, mode, err: error });
      logError('Error deleting bucket', error);
    }
    return new NextResponse('Failed to delete bucket', { status: 500 });
  }
}
