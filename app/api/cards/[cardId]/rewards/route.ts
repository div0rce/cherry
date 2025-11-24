// app/api/cards/[cardId]/rewards/route.ts
// Manage reward rules for a specific card. This lets us express "4x on DINING"
// style behavior the simulation engine can consume.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// TODO: replace with authenticated user once auth lands.
const DEMO_USER_ID = 'demo-user-id';

/**
 * Fetch the card for the current user to prevent cross-user access and give a
 * clear 404 if someone posts to a card that does not exist.
 */
async function assertCardForUser(cardId: string) {
  const card = await prisma.card.findFirst({
    where: { id: cardId, userId: DEMO_USER_ID },
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
  _request: Request,
  { params }: { params: Promise<{ cardId: string }> }
) {
  const { cardId } = await params;

  const card = await assertCardForUser(cardId);
  if (!card) {
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
  request: Request,
  { params }: { params: Promise<{ cardId: string }> }
) {
  const { cardId } = await params;
  const body = await request.json();

  const { category, multiplier, capAmountCents } = body ?? {};

  if (!category || typeof category !== 'string') {
    return new NextResponse('category is required and must be a string', {
      status: 400,
    });
  }

  if (multiplier == null || typeof multiplier !== 'number' || multiplier <= 0) {
    return new NextResponse('multiplier is required and must be > 0', {
      status: 400,
    });
  }

  if (
    capAmountCents != null &&
    (typeof capAmountCents !== 'number' || capAmountCents <= 0)
  ) {
    return new NextResponse(
      'capAmountCents must be a positive number when provided',
      { status: 400 }
    );
  }

  const card = await assertCardForUser(cardId);
  if (!card) {
    return new NextResponse('Card not found for user', { status: 404 });
  }

  const rewardRule = await prisma.rewardRule.create({
    data: {
      cardId: card.id,
      category,
      multiplier,
      capAmount: capAmountCents ?? null,
    },
  });

  return NextResponse.json(rewardRule, { status: 201 });
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
  request: Request,
  { params }: { params: Promise<{ cardId: string }> }
) {
  const { cardId } = await params;
  const body = await request.json();
  const { rewardRuleId } = body ?? {};

  if (!rewardRuleId || typeof rewardRuleId !== 'string') {
    return new NextResponse('rewardRuleId is required', { status: 400 });
  }

  const card = await assertCardForUser(cardId);
  if (!card) {
    return new NextResponse('Card not found for user', { status: 404 });
  }

  const rule = await prisma.rewardRule.findFirst({
    where: { id: rewardRuleId, cardId: card.id },
  });

  if (!rule) {
    return new NextResponse('Reward rule not found for card', { status: 404 });
  }

  await prisma.rewardRule.delete({
    where: { id: rule.id },
  });

  return new NextResponse(null, { status: 204 });
}
