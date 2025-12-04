import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveUserContext, assertUserId, isPrismaP2003, logInvariant } from '@/lib/user-context';
import { hasText } from '@/lib/text';
import { logGuardrailEvent } from '@/lib/log';

/**
 * DELETE /api/simulations/[id]
 * Removes a simulation record for the current user.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
  ): Promise<NextResponse> {
  try {
    const { userId, mode } = await resolveUserContext({ requireAuth: false, allowLabDemo: true });
    assertUserId(userId, 'api/simulations DELETE');
    const { id } = await params;

    if (!hasText(id)) {
      logGuardrailEvent({
        userId,
        surface: 'simulations',
        outcome: 'BLOCK',
        reason: 'MISSING_SIMULATION_ID',
      });
      return new NextResponse('Invalid request', { status: 400 });
    }

    const simulation = await prisma.simulatedTransaction.findFirst({
      where: { id, userId },
    });

    if (!simulation) {
      logGuardrailEvent({
        userId,
        surface: 'simulations',
        outcome: 'BLOCK',
        reason: 'SIMULATION_NOT_FOUND',
      });
      return new NextResponse('Simulation not found for user', { status: 404 });
    }

    try {
      await prisma.simulatedTransaction.delete({
        where: { id: simulation.id },
      });
    } catch (err) {
      if (isPrismaP2003(err)) {
        logInvariant('P2003 in api/simulations DELETE', { userId, mode, meta: err.meta ?? null });
        return new NextResponse('User context or FK error', { status: 500 });
      }
      throw err;
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Error && error.message?.includes('Unauthorized')) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    return new NextResponse('Failed to delete simulation', { status: 500 });
  }
}
