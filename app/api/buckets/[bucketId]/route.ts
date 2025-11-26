import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withUser } from '@/lib/with-user';
import { logError } from '@/lib/logger';

/**
 * DELETE /api/buckets/[bucketId]
 *
 * Validates ownership (demo user) and deletes the bucket.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ bucketId: string }> }
) {
  return withUser(request, async (userId) => {
    const { bucketId } = await params;

    if (!bucketId || typeof bucketId !== 'string') {
      return new NextResponse('bucketId is required', { status: 400 });
    }

    const bucket = await prisma.bucket.findFirst({
      where: { id: bucketId, userId },
    });
    if (!bucket) {
      return new NextResponse('Bucket not found for user', { status: 404 });
    }

    try {
      await prisma.bucket.delete({
        where: { id: bucket.id },
      });
      return new NextResponse(null, { status: 204 });
    } catch (error) {
      logError('Error deleting bucket', error);
      return new NextResponse('Failed to delete bucket', { status: 500 });
    }
  });
}
