import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveUserContext } from '../../../../../lib/user-context.js';
import { buildEngineContext } from '../../../../../lib/engine.js';
import { safeSolveDecisionForWorld } from '../../../../../lib/engine/run.js';
import { fromPrismaUserToEngineState } from '../../../../../lib/engine-state.js';
import { buildPrismaWorld } from '../../../../../lib/adapters/runtime/world.prisma.js';
import { parseJsonBody } from '../../../../../lib/validation.js';
import { asAppError } from '../../../../../lib/errors.js';
import { auth } from '../../../../../lib/auth.js';

const InspectRequestSchema = z
  .object({
    merchant: z.string().trim().min(1),
    amount: z.number().positive(),
    category: z.string().trim().optional(),
    mcc: z.string().trim().optional(),
  })
  .strict();

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = await resolveUserContext({
      getSession: auth,
      requireAuth: true,
      allowLabDemo: true,
    });
    const parsed = await parseJsonBody(request, InspectRequestSchema);
    if (parsed.ok !== true) {
      return parsed.response;
    }

    const { merchant, amount, category, mcc } = parsed.data;
    const now = new Date();
    const nowMs = now.getTime();
    const world = buildPrismaWorld();
    const ctx = buildEngineContext({
      surface: 'web',
      nowMs,
      merchantName: merchant,
      merchantCategoryKey: category?.toUpperCase() ?? null,
      mcc: mcc ?? null,
      amountCents: Math.round(amount * 100),
    });

    const state = await fromPrismaUserToEngineState(userId, nowMs);
    const engineResult = await safeSolveDecisionForWorld(world, userId, ctx, {
      maxCandidates: 64,
      includeLegacyDecision: false,
      stateOverride: state,
    });
    if (engineResult.ok !== true) {
      return NextResponse.json(
        {
          decisions: [],
          guardrails: [],
          error: engineResult.message ?? engineResult.reason,
        },
        { status: 200 }
      );
    }

    type DecisionSummary = {
      id: string;
      actionType: string;
      cardId: string | null;
      score: number;
      constraintsBreached: string[];
    };

    const decisions: DecisionSummary[] = engineResult.decisions.map((decision, idx) => ({
      id: `decision-${idx + 1}`,
      actionType: decision.action.type,
      cardId: decision.action.cardId ?? null,
      score: decision.score,
      constraintsBreached: decision.constraintsBreached,
    }));

    const guardrails = Array.from(
      new Set(engineResult.decisions.flatMap((decision) => decision.constraintsBreached))
    );

    return NextResponse.json({
      decisions,
      guardrails,
      topDecision: decisions[0] ?? null,
    });
  } catch (error: unknown) {
    const appError = asAppError(error);
    const message = appError.message ?? 'Engine inspect failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
