import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  SimulationSnapshotIdempotencyConflictError,
  compareAndStoreSimulationSnapshot,
} from '../../../../../lib/automation/events.js';
import { ensureRouteConfigFromEnv } from '../../../../../lib/config/route.js';
import { SimulationSnapshotCompareSchema } from '../../../../../lib/schemas/automation.js';
import { parseJsonBody } from '../../../../../lib/validation.js';
import { requireAutomationToken } from '../../_auth.js';

export async function POST(request: NextRequest): Promise<NextResponse> {
  ensureRouteConfigFromEnv(process.env);

  const auth = requireAutomationToken(request);
  if (auth.ok === false) return auth.response;

  const parsed = await parseJsonBody(request, SimulationSnapshotCompareSchema);
  if (parsed.ok === false) return parsed.response;

  let result: Awaited<ReturnType<typeof compareAndStoreSimulationSnapshot>>;
  try {
    result = await compareAndStoreSimulationSnapshot(parsed.data);
  } catch (error: unknown) {
    if (error instanceof SimulationSnapshotIdempotencyConflictError) {
      return NextResponse.json(
        { error: 'simulation_snapshot_idempotency_conflict' },
        { status: 409 }
      );
    }
    throw error;
  }

  return NextResponse.json({
    ok: true,
    created: result.created,
    snapshotId: result.snapshot.id,
    outputHash: result.snapshot.outputHash,
    comparisonOutput: result.comparisonOutput,
  });
}
