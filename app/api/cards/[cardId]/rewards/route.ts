// app/api/cards/[cardId]/rewards/route.ts
// Manage reward rules for a specific card. This lets us express "4x on DINING"
// style behavior the simulation engine can consume.

import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { RewardCategory } from '@prisma/client';
import { resolveUserContext, assertUserId, isPrismaP2003, logInvariant } from '@/lib/user-context';
import { asError, asLogMeta } from '@/lib/errors';
import { RewardRuleCreateSchema, RewardRuleDeleteSchema } from '@/lib/schemas/cards';
import { hasText } from '@/lib/text';
import { isPositiveNumber } from '@/lib/numbers';
import { logGuardrailEvent } from '@/lib/log';
import { parseJsonBody } from '@/lib/validation';

/**
 * Fetch the card for the current user to prevent cross-user access and give a
 * clear 404 if someone posts to a card that does not exist.
 */
async function assertCardForUser(cardId: string, userId: string) {
  const card = await prisma.card.findFirst({
    where: { id: cardId, userId },
  });

  if (!card) {
    return null;
  }

  return card;
}

/**
 * GET /api/cards/[cardId]/rewards
 *
 * Lists reward rules for a given card (demo user scoped).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
): Promise<NextResponse> {
  const { userId } = await resolveUserContext({ requireAuth: true, allowLabDemo: false });
  assertUserId(userId, 'api/cards/[cardId]/rewards GET');
  const { cardId } = await params;

  if (!hasText(cardId)) {
    logGuardrailEvent({
      userId,
      surface: 'rewards',
      outcome: 'STOP',
      reason: 'MISSING_CARD_ID',
    });
    return new NextResponse('Invalid request', { status: 400 });
  }

  const card = await assertCardForUser(cardId, userId);
  if (!card) {
    logGuardrailEvent({
      userId,
      surface: 'rewards',
      outcome: 'STOP',
      reason: 'CARD_NOT_FOUND',
    });
    return new NextResponse('Card not found for user', { status: 404 });
  }

  const rewardRules = await prisma.rewardRule.findMany({
    where: { cardId: card.id },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(rewardRules);
}

/**
 * POST /api/cards/[cardId]/rewards
 *
 * Creates a reward rule for the given card.
 * Expected JSON body:
 * {
 *   category: string,
 *   multiplier: number, // e.g., 4.0 for 4x
 *   capAmountCents?: number // optional cap; null means no cap
 * }
 */

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
): Promise<NextResponse> {
  const { userId, mode } = await resolveUserContext({ requireAuth: true, allowLabDemo: false });
  assertUserId(userId, 'api/cards/[cardId]/rewards POST');
  const { cardId } = await params;

  if (!hasText(cardId)) {
    logGuardrailEvent({
      userId,
      surface: 'rewards',
      outcome: 'STOP',
      reason: 'MISSING_CARD_ID',
    });
    return new NextResponse('Invalid request', { status: 400 });
  }

  const parsed = await parseJsonBody(request, RewardRuleCreateSchema);
  if (!parsed.ok) {
    logGuardrailEvent({
      userId,
      surface: 'rewards',
      outcome: 'STOP',
      reason: 'INVALID_PAYLOAD',
    });
    return NextResponse.json({ error: 'Invalid request' }, { status: parsed.response.status });
  }
  const { category, multiplier, capAmountCents } = parsed.data;
  const normalizedCategory = category.toUpperCase();
  const allowed = Object.values(RewardCategory);
  const hasValidCategory = allowed.includes(normalizedCategory as RewardCategory);
  const hasValidMultiplier = isPositiveNumber(multiplier);
  const hasValidCap =
    capAmountCents === undefined || capAmountCents === null || isPositiveNumber(capAmountCents);

  if (!hasValidCategory || !hasValidMultiplier || !hasValidCap) {
    logGuardrailEvent({
      userId,
      surface: 'rewards',
      outcome: 'STOP',
      reason: 'INVALID_FIELDS',
      detail: { hasValidCategory, hasValidMultiplier, hasValidCap },
    });
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const card = await assertCardForUser(cardId, userId);
  if (!card) {
    logGuardrailEvent({
      userId,
      surface: 'rewards',
      outcome: 'STOP',
      reason: 'CARD_NOT_FOUND',
    });
    return new NextResponse('Card not found for user', { status: 404 });
  }

  try {
    const rewardRule = await prisma.rewardRule.create({
      data: {
        cardId: card.id,
        category: normalizedCategory as RewardCategory,
        multiplier,
        capAmount: capAmountCents ?? null,
      },
    });

    return NextResponse.json(rewardRule, { status: 201 });
  } catch (err) {
    asError(err);
    if (isPrismaP2003(err)) {
      logInvariant('P2003 in api/cards/[cardId]/rewards POST', {
        userId,
        mode,
        meta: asLogMeta(err.meta),
        err,
      });
      return new NextResponse('User context or FK error', { status: 500 });
    }
    throw err;
  }
}

/**
 * DELETE /api/cards/[cardId]/rewards
 *
 * Deletes a reward rule for the given card.
 * Expected JSON body:
 * {
 *   rewardRuleId: string
 * }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
): Promise<NextResponse> {
  const { userId, mode } = await resolveUserContext({ requireAuth: true, allowLabDemo: false });
  assertUserId(userId, 'api/cards/[cardId]/rewards DELETE');
  const { cardId } = await params;

  if (!hasText(cardId)) {
    logGuardrailEvent({
      userId,
      surface: 'rewards',
      outcome: 'STOP',
      reason: 'MISSING_CARD_ID',
    });
    return new NextResponse('Invalid request', { status: 400 });
  }

  const parsed = await parseJsonBody(request, RewardRuleDeleteSchema);
  if (!parsed.ok) {
    logGuardrailEvent({
      userId,
      surface: 'rewards',
      outcome: 'STOP',
      reason: 'INVALID_PAYLOAD',
    });
    return NextResponse.json({ error: 'Invalid request' }, { status: parsed.response.status });
  }
  const { rewardRuleId } = parsed.data;
  if (!hasText(rewardRuleId)) {
    logGuardrailEvent({
      userId,
      surface: 'rewards',
      outcome: 'STOP',
      reason: 'MISSING_REWARD_RULE_ID',
    });
    return new NextResponse('Invalid request', { status: 400 });
  }

  const card = await assertCardForUser(cardId, userId);
  if (!card) {
    logGuardrailEvent({
      userId,
      surface: 'rewards',
      outcome: 'STOP',
      reason: 'CARD_NOT_FOUND',
    });
    return new NextResponse('Card not found for user', { status: 404 });
  }

  const rule = await prisma.rewardRule.findFirst({
    where: { id: rewardRuleId, cardId: card.id },
  });

  if (!rule) {
    logGuardrailEvent({
      userId,
      surface: 'rewards',
      outcome: 'STOP',
      reason: 'REWARD_RULE_NOT_FOUND',
    });
    return new NextResponse('Reward rule not found for card', { status: 404 });
  }

  try {
    await prisma.rewardRule.delete({
      where: { id: rule.id },
    });
  } catch (err) {
    asError(err);
    if (isPrismaP2003(err)) {
      logInvariant('P2003 in api/cards/[cardId]/rewards DELETE', {
        userId,
        mode,
        meta: asLogMeta(err.meta),
        err,
      });
      return new NextResponse('User context or FK error', { status: 500 });
    }
    throw err;
  }

  return new NextResponse(null, { status: 204 });
}
