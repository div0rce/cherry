import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// TODO: replace with authenticated user.
const DEMO_USER_ID = 'demo-user-id';

/**
 * DELETE /api/simulations/[id]
 * Removes a simulation record for the current user.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const simulation = await prisma.simulatedTransaction.findFirst({
    where: { id, userId: DEMO_USER_ID },
  });

  if (!simulation) {
    return new NextResponse('Simulation not found for user', { status: 404 });
  }

  await prisma.simulatedTransaction.delete({
    where: { id: simulation.id },
  });

  return new NextResponse(null, { status: 204 });
}
