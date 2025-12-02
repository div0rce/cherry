import { NextRequest, NextResponse } from 'next/server';
import {
  buildEngineContext,
  mapSolverDecisionToLegacyDecision,
  safeSolveDecisionForUser,
  type LegacyEngineDecision,
} from '@/lib/engine';
import { resolveScanCategory } from '@/lib/scan-helpers';
import type { ScanResponseBody } from '@/lib/scan-types';
import { logError } from '@/lib/logger';
import { ScanRequestSchema } from '@/lib/schemas/scan';
import { parseJsonBody } from '@/lib/validation';
import { validateEngineDecision } from '@/lib/engine-invariants';
import { resolveUserContext } from '@/lib/user-context';
import type { RewardCategory } from '@prisma/client';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = await resolveUserContext({ requireAuth: false, allowLabDemo: true });
    const parsed = await parseJsonBody(request, ScanRequestSchema);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;

    if (!body.merchantName || typeof body.merchantName !== 'string') {
      return NextResponse.json(
        { error: 'merchantName is required and must be a string' },
        { status: 400 }
      );
    }

    const category: RewardCategory = await resolveScanCategory({
      userId,
      merchantName: body.merchantName,
      mccCode: typeof body.mccCode === 'number' ? body.mccCode : null,
      explicitCategory: body.category ?? null,
    });

    const amountCents =
      typeof body.expectedAmountCents === 'number' &&
      Number.isFinite(body.expectedAmountCents) &&
      body.expectedAmountCents >= 0
        ? Math.floor(body.expectedAmountCents)
        : 0;

    try {
      const ctx = buildEngineContext({
        surface: 'web',
        now: new Date(),
        merchantName: body.merchantName,
        merchantCategoryKey: category,
        mcc: typeof body.mccCode === 'number' ? String(body.mccCode) : null,
        amountCents,
      });

      const engineResult = await safeSolveDecisionForUser(userId, ctx, { maxCandidates: 64 });

      if (!engineResult.ok) {
        return NextResponse.json(
          {
            error: {
              code: engineResult.reason,
              message: engineResult.message,
            },
            decision: null,
          },
          { status: 200 }
        );
      }

      const topDecision = engineResult.decisions.at(0);
      const mappedDecision: LegacyEngineDecision | null = mapSolverDecisionToLegacyDecision({
        ...(topDecision ? { solverDecision: topDecision } : {}),
        state: engineResult.state,
        ctx,
        category,
        ...(engineResult.legacyDecision ? { fallback: engineResult.legacyDecision } : {}),
      });

      if (!mappedDecision) {
        return NextResponse.json(
          {
            error: { code: 'ENGINE_MAPPING', message: 'Unable to build decision' },
            decision: null,
          },
          { status: 200 }
        );
      }

      const decision: LegacyEngineDecision = mappedDecision;
      validateEngineDecision(decision);

      const bucket = decision.budget;
      const routing = decision.card;

      const response: ScanResponseBody = {
        merchantName: body.merchantName,
        category: decision.category,
        amountCents,
        bucket: {
          name: bucket.name ?? null,
          limitCents: bucket.limitCents ?? null,
          spentBeforeCents: bucket.spentBeforeCents ?? null,
          spentAfterCents: bucket.spentAfterCents ?? null,
          remainingAfterCents: bucket.remainingAfterCents ?? null,
          strictMode: bucket.strictMode ?? false,
          wouldExceed: bucket.wouldExceed ?? false,
          coverageMode: bucket.coverageMode,
          verdict: bucket.verdict,
        },
        cardRecommendation: {
          cardId: routing.cardId ?? null,
          cardNickname: routing.cardNickname ?? null,
          rewardMultiplier: routing.multiplier ?? null,
          estimatedRewards: routing.estimatedRewards ?? null,
          verdict: routing.verdict,
        },
        budgetVerdict: decision.budget.verdict,
        cardVerdict: decision.card.verdict,
        overallVerdict: decision.overallVerdict,
        cherryIncentive: decision.cherryIncentive,
        engineDecision: decision,
      };

      return NextResponse.json(response);
    } catch (error) {
      logError('Error in /api/scan', error);
      return NextResponse.json({ error: 'Failed to evaluate scan' }, { status: 500 });
    }
  } catch (error) {
    if (error instanceof Error && error.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    logError('Error in /api/scan', error);
    return NextResponse.json({ error: 'Failed to evaluate scan' }, { status: 500 });
  }
}
