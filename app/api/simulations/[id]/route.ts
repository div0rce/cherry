import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma.js';
import { resolveUserContext, assertUserId, isPrismaP2003, logInvariant } from '../../../../lib/user-context.js';
import { hasText } from '../../../../lib/text.js';
import { logGuardrailEvent } from '../../../../lib/log.js';
import { asAppError, isUnauthorized } from '../../../../lib/errors.js';

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
        outcome: 'STOP',
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
        outcome: 'STOP',
        reason: 'SIMULATION_NOT_FOUND',
      });
      return new NextResponse('Simulation not found for user', { status: 404 });
    }

    try {
      await prisma.simulatedTransaction.delete({
        where: { id: simulation.id },
      });
    } catch (err: unknown) {
      const appError = asAppError(err);
      if (isPrismaP2003(err)) {
        const metaValue = err.meta == null ? null : String(err.meta);
        logInvariant('P2003 in api/simulations DELETE', {
          userId,
          mode,
          meta: metaValue,
          err,
        });
        return new NextResponse('User context or FK error', { status: 500 });
      }
      throw appError;
    }

    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    const appError = asAppError(error);
    if (isUnauthorized(appError)) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    return new NextResponse('Failed to delete simulation', { status: 500 });
  }
}
