// app/api/cards/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// TODO: replace with real auth; for now, hardcode a user or mock
const DEMO_USER_ID = 'demo-user-id';

// Temporary category validation until a TransactionCategory enum exists in Prisma.
const ALLOWED_CATEGORIES = [
  'DINING',
  'GROCERIES',
  'GAS',
  'TRAVEL',
  'ONLINE',
  'ENTERTAINMENT',
  'GENERAL',
  'OTHER',
];

type IncomingRewardRule = {
  category?: string;
  multiplier?: number;
  cashbackPercent?: number;
  capAmountCents?: number | null;
};

function parseRewardRules(rawRules: unknown): {
  ok: true;
  rules: Array<{ category: string; multiplier: number; capAmount: number | null }>;
} | { ok: false; message: string } {
  if (!rawRules) {
    return { ok: true, rules: [] };
  }

  if (!Array.isArray(rawRules)) {
    return { ok: false, message: 'rewardRules must be an array' };
  }

  const parsed: Array<{ category: string; multiplier: number; capAmount: number | null }> = [];

  for (const rule of rawRules) {
    const { category, multiplier, cashbackPercent, capAmountCents } =
      (rule as IncomingRewardRule) ?? {};
    // Accept both camel variants for percent.
    const percent = cashbackPercent ?? (rule as any)?.cashBackPercent;

    if (!category || typeof category !== 'string') {
      return { ok: false, message: 'Each reward rule needs a category string' };
    }
    const normalizedCategory = category.toUpperCase();
    if (!ALLOWED_CATEGORIES.includes(normalizedCategory)) {
      return {
        ok: false,
        message: `Invalid category "${category}". Allowed: ${ALLOWED_CATEGORIES.join(', ')}`,
      };
    }

    const hasMultiplier = multiplier != null;
    const hasPercent = percent != null;
    if (!hasMultiplier && !hasPercent) {
      return {
        ok: false,
        message: `Reward rule for ${category} needs multiplier or cashbackPercent`,
      };
    }

    const numericMultiplier = hasMultiplier ? Number(multiplier) : Number(percent) / 100;

    if (!Number.isFinite(numericMultiplier) || numericMultiplier <= 0) {
      return {
        ok: false,
        message: `Reward rule for ${category} has invalid multiplier`,
      };
    }

    if (
      capAmountCents != null &&
      (typeof capAmountCents !== 'number' || capAmountCents <= 0)
    ) {
      return {
        ok: false,
        message: `Reward rule for ${category} has invalid capAmountCents`,
      };
    }

    parsed.push({
      category: normalizedCategory,
      multiplier: numericMultiplier,
      capAmount: capAmountCents ?? null,
    });
  }

  return { ok: true, rules: parsed };
}

export async function GET() {
  // list cards for demo user
  const cards = await prisma.card.findMany({
    where: { userId: DEMO_USER_ID },
    include: {
      rewardRules: true,
    },
  });

  return NextResponse.json(cards);
}

export async function POST(request: Request) {
  const body = await request.json();

  const { nickname, issuer, network, isCredit, annualFee, rewardRules } = body;

  if (!nickname || !issuer || !network) {
    return new NextResponse('Missing fields', { status: 400 });
  }

  const parsedRules = parseRewardRules(rewardRules);
  if (!parsedRules.ok) {
    return new NextResponse(parsedRules.message, { status: 400 });
  }

  // Upsert a demo user for now
  const user = await prisma.user.upsert({
    where: { id: DEMO_USER_ID },
    update: {},
    create: {
      id: DEMO_USER_ID,
      email: 'demo@example.com',
      name: 'Demo User',
    },
  });

  const card = await prisma.card.create({
    data: {
      userId: user.id,
      nickname,
      issuer,
      network,
      isCredit: Boolean(isCredit),
      annualFee: annualFee ?? null,
      rewardRules:
        parsedRules.rules.length > 0 ? { create: parsedRules.rules } : undefined,
    },
    include: {
      rewardRules: true,
    },
  });

  return NextResponse.json(card, { status: 201 });
}

/**
 * DELETE /api/cards
 *
 * Deletes a card for the demo user. Expects JSON body:
 * { cardId: string }
 *
 * We null out chosenCardId on any existing simulations to avoid FK issues, then
 * delete the card. Reward rules cascade via the Prisma relation.
 */
export async function DELETE(request: Request) {
  const body = await request.json();
  const { cardId } = body ?? {};

  if (!cardId || typeof cardId !== 'string') {
    return new NextResponse('cardId is required', { status: 400 });
  }

  const card = await prisma.card.findFirst({
    where: { id: cardId, userId: DEMO_USER_ID },
  });

  if (!card) {
    return new NextResponse('Card not found for user', { status: 404 });
  }

  // Disconnect any historical simulations from this card to satisfy FK constraints.
  await prisma.simulatedTransaction.updateMany({
    where: { chosenCardId: card.id },
    data: { chosenCardId: null },
  });

  await prisma.card.delete({
    where: { id: card.id },
  });

  return new NextResponse(null, { status: 204 });
}
