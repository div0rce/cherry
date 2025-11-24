// app/api/simulate/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { runSimulation, SimulationInput } from '@/lib/simulation';

// For now we hardcode a demo user. Later this becomes session.user.id from auth.
const DEMO_USER_ID = 'demo-user-id';

/**
 * POST /api/simulate
 *
 * Simulates a transaction through the Cherry engine.
 *
 * Expected JSON body:
 * {
 *   amountCents: number,
 *   category?: string,
 *   merchantName?: string,
 *   mccCode?: number
 * }
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<SimulationInput>;

    const { amountCents, category, merchantName, mccCode } = body;

    if (amountCents == null || typeof amountCents !== 'number') {
      return new NextResponse('amountCents is required and must be a number', {
        status: 400,
      });
    }

    if (amountCents <= 0) {
      return new NextResponse('amountCents must be greater than 0', {
        status: 400,
      });
    }

    if (mccCode != null && (!Number.isInteger(mccCode) || String(mccCode).length !== 4)) {
      return new NextResponse('mccCode must be a 4-digit integer if provided', { status: 400 });
    }

    // Ensure demo user exists (consistent with /api/cards and /api/buckets).
    const user = await prisma.user.upsert({
      where: { id: DEMO_USER_ID },
      update: {},
      create: {
        id: DEMO_USER_ID,
        email: 'demo@example.com',
        name: 'Demo User',
      },
    });

    const result = await runSimulation(prisma, user.id, {
      amountCents,
      category: category ?? undefined,
      merchantName,
      mccCode: mccCode ?? undefined,
    });

    // The engine returns a transaction with nested chosenCard + bucket.
    // We can return it as-is or wrap it in a higher-level object.
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Error in /api/simulate:', error);

    // If the error is from our own validation throw in runSimulation, surface it.
    if (error instanceof Error) {
      return new NextResponse(error.message, { status: 400 });
    }

    return new NextResponse('Failed to run simulation', { status: 500 });
  }
}
