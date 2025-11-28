import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withUser } from '@/lib/with-user';

/**
 * DELETE /api/simulations/[id]
 * Removes a simulation record for the current user.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  return withUser(request, async (userId) => {
    const { id } = await params;

    const simulation = await prisma.simulatedTransaction.findFirst({
      where: { id, userId },
    });

    if (!simulation) {
      return new NextResponse('Simulation not found for user', { status: 404 });
    }

    await prisma.simulatedTransaction.delete({
      where: { id: simulation.id },
    });

    return new NextResponse(null, { status: 204 });
  });
}
