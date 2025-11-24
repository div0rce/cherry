import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DEMO_USER_ID, findBucketForUser } from '../route';

/**
 * DELETE /api/buckets/[bucketId]
 *
 * Validates ownership (demo user) and deletes the bucket.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ bucketId: string }> }
) {
  const { bucketId } = await params;

  if (!bucketId || typeof bucketId !== 'string') {
    return new NextResponse('bucketId is required', { status: 400 });
  }

  const bucket = await findBucketForUser(bucketId);
  if (!bucket) {
    return new NextResponse('Bucket not found for user', { status: 404 });
  }

  try {
    await prisma.bucket.delete({
      where: { id: bucket.id },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting bucket:', error);
    return new NextResponse('Failed to delete bucket', { status: 500 });
  }
}
