import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveUserContext } from '@/lib/user-context';
import { buildEngineContext, safeSolveDecisionForUser } from '@/lib/engine';
import { parseJsonBody } from '@/lib/validation';

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
    const { userId } = await resolveUserContext({ requireAuth: true, allowLabDemo: true });
    const parsed = await parseJsonBody(request, InspectRequestSchema);
    if (!parsed.ok) {
      return parsed.response;
    }

    const { merchant, amount, category, mcc } = parsed.data;
    const ctx = buildEngineContext({
      surface: 'web',
      now: new Date(),
      merchantName: merchant,
      merchantCategoryKey: category?.toUpperCase() ?? null,
      mcc: mcc ?? null,
      amountCents: Math.round(amount * 100),
    });

    const engineResult = await safeSolveDecisionForUser(userId, ctx, { maxCandidates: 64 });
    if (!engineResult.ok) {
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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Engine inspect failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
