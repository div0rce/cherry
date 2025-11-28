// app/api/cards/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma, RewardCategory } from '@prisma/client';
import { withUser } from '@/lib/with-user';

const ALLOWED_CATEGORIES = Object.values(RewardCategory);

type IncomingRewardRule = {
  category?: string;
  multiplier?: number;
  cashbackPercent?: number;
  capAmountCents?: number | null;
};

type ParsedRule = { category: RewardCategory; multiplier: number; capAmount: number | null };

function parseRewardRules(rawRules: unknown): {
  ok: true;
  rules: ParsedRule[];
} | { ok: false; message: string } {
  if (!rawRules) {
    return { ok: true, rules: [] };
  }

  if (!Array.isArray(rawRules)) {
    return { ok: false, message: 'rewardRules must be an array' };
  }

  const parsed: ParsedRule[] = [];

  for (const rule of rawRules) {
    const { category, multiplier, cashbackPercent, capAmountCents } =
      (rule as IncomingRewardRule) ?? {};
    // Accept both camel variants for percent.
    const percent =
      cashbackPercent ??
      (typeof rule === 'object' && rule !== null
        ? (rule as { cashBackPercent?: number }).cashBackPercent
        : undefined);

    if (!category || typeof category !== 'string') {
      return { ok: false, message: 'Each reward rule needs a category string' };
    }
    const normalizedCategory = category.toUpperCase();
    if (!ALLOWED_CATEGORIES.includes(normalizedCategory as RewardCategory)) {
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
      category: normalizedCategory as RewardCategory,
      multiplier: numericMultiplier,
      capAmount: capAmountCents ?? null,
    });
  }

  return { ok: true, rules: parsed };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return withUser(request, async (userId) => {
    const cards = await prisma.card.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { rewardRules: true },
    });
    return NextResponse.json(cards);
  });
}

type CardBody = {
  nickname?: unknown;
  issuer?: unknown;
  network?: unknown;
  isCredit?: unknown;
  annualFee?: unknown;
  rewardRules?: unknown;
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  return withUser(request, async (userId) => {
    const body = (await request.json()) as CardBody;
    const { nickname, issuer, network, isCredit, annualFee, rewardRules } = body;

    if (
      typeof nickname !== 'string' ||
      typeof issuer !== 'string' ||
      typeof network !== 'string'
    ) {
      return new NextResponse('Missing fields', { status: 400 });
    }

    const nicknameStr = nickname.trim();
    const issuerStr = issuer.trim();
    const networkStr = network.trim();
    if (!nicknameStr || !issuerStr || !networkStr) {
      return new NextResponse('Missing fields', { status: 400 });
    }

    let annualFeeValue: number | null = null;
    if (annualFee != null) {
      if (typeof annualFee !== 'number' || Number.isNaN(annualFee)) {
        return new NextResponse('annualFee must be a number when provided', { status: 400 });
      }
      annualFeeValue = annualFee;
    }

    const parsedRules = parseRewardRules(rewardRules);
    if (!parsedRules.ok) {
      return new NextResponse(parsedRules.message, { status: 400 });
    }

    const data: Prisma.CardCreateInput = {
      user: { connect: { id: userId } },
      nickname: nicknameStr,
      issuer: issuerStr,
      network: networkStr,
      isCredit: Boolean(isCredit),
      annualFee: annualFeeValue,
    };

    if (parsedRules.rules.length > 0) {
      data.rewardRules = {
        create: parsedRules.rules.map((rule) => ({
          category: rule.category,
          multiplier: rule.multiplier,
          capAmount: rule.capAmount,
        })),
      };
    }

    const card = await prisma.card.create({
      data,
      include: {
        rewardRules: true,
      },
    });

    return NextResponse.json(card, { status: 201 });
  });
}

type DeleteCardBody = { cardId?: unknown };

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  return withUser(request, async (userId) => {
    const body = (await request.json()) as DeleteCardBody;
    const { cardId } = body ?? {};

    if (!cardId || typeof cardId !== 'string') {
      return new NextResponse('cardId is required', { status: 400 });
    }

    const card = await prisma.card.findFirst({
      where: { id: cardId, userId },
    });

    if (!card) {
      return new NextResponse('Card not found for user', { status: 404 });
    }

    await prisma.simulatedTransaction.updateMany({
      where: { chosenCardId: card.id, userId },
      data: { chosenCardId: null },
    });

    await prisma.card.delete({
      where: { id: card.id },
    });

    return new NextResponse(null, { status: 204 });
  });
}
