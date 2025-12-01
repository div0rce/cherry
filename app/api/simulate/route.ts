import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { RewardCategory, TransactionStatus } from '@prisma/client';
import { withUser } from '@/lib/with-user';
import { prisma } from '@/lib/prisma';
import { runSimulation } from '@/lib/simulation-adapter';
import { logError, logWarn } from '@/lib/logger';
import { parseJsonBody } from '@/lib/validation';
import { SimulateRequestSchema } from '@/lib/schemas/simulate';
import { validateEngineDecision } from '@/lib/engine-invariants';

const validCategories = Object.values(RewardCategory) as string[];

export async function POST(request: NextRequest): Promise<NextResponse> {
  return withUser(request, async (userId) => {
    try {
      const parsed = await parseJsonBody(request, SimulateRequestSchema);
      if (!parsed.ok) return parsed.response;
      const body = parsed.data;

      const errors: string[] = [];
      const normalizedCategory =
        typeof body?.category === 'string' ? body.category.trim().toUpperCase() : '';

      if (typeof body?.amountCents !== 'number' || Number.isNaN(body.amountCents)) {
        errors.push('amountCents must be a number');
      } else if (body.amountCents <= 0) {
        errors.push('amountCents must be greater than 0');
      }

      if (!normalizedCategory || !validCategories.includes(normalizedCategory)) {
        errors.push('category must be a valid RewardCategory');
      }

      if (body?.merchantName != null && typeof body.merchantName !== 'string') {
        errors.push('merchantName must be a string');
      }

      if (body?.mccCode != null) {
        const asInt = Number.parseInt(String(body.mccCode), 10);
        if (!Number.isInteger(asInt) || String(asInt).length !== 4) {
          errors.push('mccCode must be a 4-digit integer if provided');
        }
      }

      if (errors.length > 0) {
        logWarn('Validation failed in /api/simulate', { userId, errors, body });
        return NextResponse.json(
          { error: 'Validation failed', details: errors },
          { status: 400 }
        );
      }

      const merchantName =
        typeof body?.merchantName === 'string' && body.merchantName.trim().length > 0
          ? body.merchantName.trim()
          : '';
      const mccCode =
        body?.mccCode != null && !Number.isNaN(Number(body.mccCode))
          ? Number.parseInt(String(body.mccCode), 10)
          : null;

      const simulationId =
        body.simulationId ??
        (
          await prisma.simulation.create({
            data: { userId },
            select: { id: true },
          })
        ).id;

      const { decision } = await runSimulation({
        userId,
        amountCents: body.amountCents as number,
        category: normalizedCategory as RewardCategory,
        merchantName,
        mccCode: mccCode ?? null,
      });
      validateEngineDecision(decision);

      const strictDecline =
        (decision.budget.wouldExceed ?? false) && (decision.budget.strictMode ?? false);
      const bucketBeforeCents =
        decision.budget.limitCents != null && decision.budget.spentBeforeCents != null
          ? decision.budget.limitCents - decision.budget.spentBeforeCents
          : null;
      const bucketAfterCents = strictDecline
        ? bucketBeforeCents
        : decision.budget.remainingAfterCents ?? null;
      const bucketLimitCents = decision.budget.limitCents ?? null;
      const rewardMultiplier = decision.card.multiplier ?? null;
      const rewardsEarnedPoints = decision.card.estimatedRewards ?? null;
      const tx = await prisma.simulatedTransaction.create({
        data: {
          simulationId,
          userId,
          amount: body.amountCents as number,
          merchantName,
          resolvedCategory: decision.category,
          mccCode,

          bucketId: decision.budget.bucketId ?? null,
          bucketName: decision.budget.name ?? null,
          bucketPeriod: null,
          bucketBeforeCents,
          bucketAfterCents,
          bucketLimitCents,

          chosenCardId: decision.card.cardId ?? null,
          chosenCardName: decision.card.cardNickname ?? null,

          rewardMultiplier,
          rewardsEarned: rewardsEarnedPoints,
          multiplier: rewardMultiplier,
          cashbackPercent: null,
          rewardsEarnedPoints: rewardsEarnedPoints,
          rewardsEarnedCents: null,

          strictDecline,
          status: strictDecline ? TransactionStatus.DECLINED : TransactionStatus.APPROVED,
          reason: strictDecline ? 'STRICT_DECLINE' : 'APPROVED',
        },
      });

      return NextResponse.json({
        simulationId,
        transaction: tx,
        decision,
      });
    } catch (error) {
      logError('Error in /api/simulate', error);
      return NextResponse.json({ error: 'Failed to run simulation' }, { status: 500 });
    }
  });
}
