import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma.js';
import { resolveUserContext, assertUserId, isPrismaP2003, logInvariant } from '../../../../lib/user-context.js';
import { hasText } from '../../../../lib/text.js';
import { logGuardrailEvent } from '../../../../lib/log.js';
import { asAppError, isUnauthorized } from '../../../../lib/errors.js';
import { auth } from '../../../../lib/auth.js';

function logSimulationStop(userId: string, reason: string, timestamp: string): void {
  logGuardrailEvent({
    userId,
    surface: 'simulations',
    outcome: 'STOP',
    reason,
    timestamp,
    timestampSource: 'boundary',
  });
}

async function deleteSimulation(
  simulationId: string,
  userId: string,
  mode: string | null
): Promise<NextResponse> {
  try {
    await prisma.simulatedTransaction.delete({
      where: { id: simulationId },
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
}

/**
 * DELETE /api/simulations/[id]
 * Removes a simulation record for the current user.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
  ): Promise<NextResponse> {
  const requestTimestamp = new Date().toISOString();
  try {
    const { userId, mode } = await resolveUserContext({
      getSession: auth,
      requireAuth: false,
      allowLabDemo: true,
    });
    assertUserId(userId, 'api/simulations DELETE');
    const { id } = await params;

    if (!hasText(id)) {
      logSimulationStop(userId, 'MISSING_SIMULATION_ID', requestTimestamp);
      return new NextResponse('Invalid request', { status: 400 });
    }

    const simulation = await prisma.simulatedTransaction.findFirst({
      where: { id, userId },
    });

    if (simulation === null) {
      logSimulationStop(userId, 'SIMULATION_NOT_FOUND', requestTimestamp);
      return new NextResponse('Simulation not found for user', { status: 404 });
    }

    return await deleteSimulation(simulation.id, userId, mode);
  } catch (error: unknown) {
    const appError = asAppError(error);
    if (isUnauthorized(appError)) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    return new NextResponse('Failed to delete simulation', { status: 500 });
  }
}
