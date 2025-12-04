import { prisma } from '@/lib/prisma';
import { BANK_TX_DEFAULT_ORDER } from '@/lib/bank/fields';

function hasNonEmptyString(value?: string | null): value is string {
  return value !== undefined && value !== null && value !== '';
}

export type ActivitySource =
  | 'BANK_FEED'
  | 'STATEMENT_VIEW'
  | 'VINE_SIM'
  | 'MANUAL_LOOKUP'
  | 'OTHER_SIM';
export type ActivityKind = 'REAL_TRANSACTION' | 'SIMULATED_TRANSACTION' | 'POINTS_EVENT' | 'OTHER';
export type UnifiedDirection = 'DEBIT' | 'CREDIT';
export type ActivityOrigin = 'REAL' | 'SIMULATED';

export interface UnifiedActivityRow {
  id: string;
  source: ActivitySource;
  providerSource?: string | null;
  kind: ActivityKind;
  origin: ActivityOrigin;
  occurredAt: Date;
  postedAt?: Date | null;
  cashDeltaCents?: number | null;
  amount: number;
  currency: string;
  direction: UnifiedDirection;
  merchantName: string | null;
  mcc: number | null;
  merchantLocation?: {
    city?: string;
    region?: string;
    country?: string;
  };
  cardBrand?: string | null;
  cardLast4?: string | null;
  cardName?: string | null;
  cardId?: string | null;
  pointsEarned?: number;
  pointsDelta?: number | null;
  bucketId?: string | null;
  rewardCategory?: string | null;
  statementPeriod?:
    | {
        year: number;
        month: number;
      }
    | null;
}

function deriveStatementPeriod(date: Date) {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
  };
}

export async function getUnifiedActivityForUser(
  userId: string,
  options?: {
    limit?: number;
    sourceFilter?: ActivitySource[];
    periodFilter?: { year: number; month: number } | null;
  },
): Promise<UnifiedActivityRow[]> {
  const limit = options?.limit ?? 200;
  const periodFilter = options?.periodFilter ?? null;
  const periodRange = periodFilter
    ? {
        start: new Date(Date.UTC(periodFilter.year, periodFilter.month - 1, 1)),
        end: new Date(Date.UTC(periodFilter.year, periodFilter.month, 1)),
      }
    : null;

  const includeBankSources =
    !options?.sourceFilter ||
    options.sourceFilter.some((source) => source === 'BANK_FEED' || source === 'STATEMENT_VIEW');
  const includeSimSources =
    !options?.sourceFilter ||
    options.sourceFilter.some(
      (source) => source === 'VINE_SIM' || source === 'MANUAL_LOOKUP' || source === 'OTHER_SIM',
    );

  const bankWhere =
    includeBankSources && periodRange
      ? {
          userId,
          postedAt: {
            gte: periodRange.start,
            lt: periodRange.end,
          },
        }
      : { userId };

  const [bankTx, ledger, simulated, sessions] = await Promise.all([
    includeBankSources
      ? prisma.bankTransaction.findMany({
          where: bankWhere,
          orderBy: BANK_TX_DEFAULT_ORDER,
          take: limit,
          include: { merchantObservation: true },
        })
      : Promise.resolve([]),
    includeSimSources
      ? prisma.cherryPointLedger.findMany({
          where: {
            userId,
            ...(periodRange
              ? {
                  awardedAt: {
                    gte: periodRange.start,
                    lt: periodRange.end,
                  },
                }
              : {}),
          },
          orderBy: { awardedAt: 'desc' },
          take: limit,
          include: {
            session: {
              include: {
                recommendedCard: { select: { id: true, nickname: true, network: true } },
              },
            },
            merchantObservation: true,
          },
        })
      : Promise.resolve([]),
    includeSimSources
      ? prisma.simulatedTransaction.findMany({
          where: {
            userId,
            ...(periodRange
              ? {
                  createdAt: {
                    gte: periodRange.start,
                    lt: periodRange.end,
                  },
                }
              : {}),
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          include: {
            chosenCard: { select: { id: true, nickname: true, network: true } },
          },
        })
      : Promise.resolve([]),
    prisma.recommendationSession.findMany({
      where: {
        userId,
        ...(periodRange
          ? {
              createdAt: {
                gte: periodRange.start,
                lt: periodRange.end,
              },
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        recommendedCard: { select: { id: true, nickname: true, network: true } },
      },
      take: limit,
    }),
  ]);

  const sourceFilter = options?.sourceFilter ?? null;
  const hasSourceFilter = Array.isArray(sourceFilter) && sourceFilter.length > 0;
  const shouldTagAsStatement =
    hasSourceFilter &&
    sourceFilter.includes('STATEMENT_VIEW') &&
    !sourceFilter.includes('BANK_FEED');

  const bankRows: UnifiedActivityRow[] = bankTx.map((tx) => {
    const rawAmount = Number(tx.amount);
    const amountMinor =
      typeof tx.amountMinor === 'number'
        ? tx.amountMinor
        : Math.round(rawAmount * 100) * (tx.direction === 'CREDIT' ? 1 : -1);
    const amountCents = Math.abs(amountMinor);
    const cashDeltaCents = tx.direction === 'CREDIT' ? amountCents : amountCents * -1;

    let merchantLocation: UnifiedActivityRow['merchantLocation'];
    const hasMerchantLocation =
      hasNonEmptyString(tx.merchantCity) ||
      hasNonEmptyString(tx.merchantRegion) ||
      hasNonEmptyString(tx.merchantCountry) ||
      (tx.merchantObservation !== null && tx.merchantObservation !== undefined);
    if (hasMerchantLocation) {
      const location: NonNullable<UnifiedActivityRow['merchantLocation']> = {};
      const city = tx.merchantCity ?? tx.merchantObservation?.city;
      const region = tx.merchantRegion ?? tx.merchantObservation?.region;
      const country = tx.merchantCountry ?? tx.merchantObservation?.country;
      if (hasNonEmptyString(city)) location.city = city;
      if (hasNonEmptyString(region)) location.region = region;
      if (hasNonEmptyString(country)) location.country = country;
      merchantLocation = location;
    }

    const occurredAt = tx.postedAt;
    const statementPeriod = deriveStatementPeriod(occurredAt);

    const base: UnifiedActivityRow = {
      id: `bank-${tx.id}`,
      source: shouldTagAsStatement ? 'STATEMENT_VIEW' : 'BANK_FEED',
      providerSource: tx.source ?? null,
      kind: 'REAL_TRANSACTION',
      origin: 'REAL',
      occurredAt,
      postedAt: tx.postedAt ?? null,
      cashDeltaCents,
      amount: Number(tx.amount),
      currency: tx.currency,
      direction: tx.direction === 'CREDIT' ? 'CREDIT' : 'DEBIT',
      merchantName: tx.merchantName ?? tx.description ?? tx.rawDescription ?? tx.merchantObservation?.merchantName ?? null,
      mcc: tx.mcc ?? tx.merchantObservation?.mcc ?? null,
      cardBrand: tx.cardBrand ?? null,
      cardLast4: tx.cardLast4 ?? null,
      cardName: null,
      cardId: null,
      rewardCategory: null,
      pointsDelta: null,
      statementPeriod,
    };

    return merchantLocation ? { ...base, merchantLocation } : base;
  });

  const ledgerRows: UnifiedActivityRow[] = ledger.map((row) => {
    const session = row.session;
    const source: ActivitySource =
      hasNonEmptyString(session?.deviceId)
        ? 'VINE_SIM'
        : session !== null && session !== undefined
          ? 'MANUAL_LOOKUP'
          : 'OTHER_SIM';

    let merchantLocation: UnifiedActivityRow['merchantLocation'];
    if (row.merchantObservation) {
      const location: NonNullable<UnifiedActivityRow['merchantLocation']> = {};
      if (hasNonEmptyString(row.merchantObservation.city)) location.city = row.merchantObservation.city;
      if (hasNonEmptyString(row.merchantObservation.region)) location.region = row.merchantObservation.region;
      if (hasNonEmptyString(row.merchantObservation.country)) location.country = row.merchantObservation.country;
      merchantLocation = location;
    }

    const occurredAt = row.awardedAt ?? row.createdAt;
    const statementPeriod = deriveStatementPeriod(occurredAt);
    const sessionAmountCents = session?.amountCents ?? 0;
    const hasSessionAmount =
      sessionAmountCents !== null &&
      sessionAmountCents !== undefined &&
      !Number.isNaN(sessionAmountCents);

    const base: UnifiedActivityRow = {
      id: `ledger-${row.id}`,
      source,
      kind: 'POINTS_EVENT',
      origin: 'SIMULATED',
      occurredAt,
      cashDeltaCents: hasSessionAmount ? sessionAmountCents * -1 : 0,
      amount: hasSessionAmount ? sessionAmountCents / 100 : 0,
      currency: session?.currency ?? 'USD',
      direction: row.points >= 0 ? 'CREDIT' : 'DEBIT',
      merchantName: session?.merchantName ?? row.merchantObservation?.merchantName ?? 'Points event',
      mcc: session?.mccCode ?? row.merchantObservation?.mcc ?? null,
      cardBrand: session?.recommendedCard?.network ?? null,
      cardLast4: null,
      cardName: session?.recommendedCard?.nickname ?? null,
      cardId: session?.recommendedCard?.id ?? null,
      pointsEarned: row.points,
      pointsDelta: row.points,
      bucketId: session?.recommendedBucketId ?? null,
      rewardCategory: session?.category ?? null,
      statementPeriod,
    };

    return merchantLocation ? { ...base, merchantLocation } : base;
  });

  const simulatedRows: UnifiedActivityRow[] = simulated.map((sim) => {
    const occurredAt = sim.createdAt;
    const statementPeriod = deriveStatementPeriod(occurredAt);

    const base: UnifiedActivityRow = {
      id: `sim-${sim.id}`,
      source: 'OTHER_SIM',
      kind: 'SIMULATED_TRANSACTION',
      origin: 'SIMULATED',
      occurredAt,
      cashDeltaCents: -sim.amount,
      amount: sim.amount / 100,
      currency: sim.currency,
      direction: 'DEBIT',
      merchantName: sim.merchantName ?? null,
      mcc: sim.mccCode ?? null,
      cardBrand: sim.chosenCard?.network ?? null,
      cardLast4: null,
      cardName: sim.chosenCard?.nickname ?? sim.chosenCardName ?? null,
      cardId: sim.chosenCard?.id ?? sim.chosenCardId ?? null,
      pointsDelta: sim.rewardsEarnedPoints ?? null,
      bucketId: sim.bucketId ?? null,
      rewardCategory: sim.resolvedCategory,
      statementPeriod,
    };

    return sim.rewardsEarnedPoints != null
      ? { ...base, pointsEarned: sim.rewardsEarnedPoints }
      : base;
  });

  const recommendationRows: UnifiedActivityRow[] = sessions.map((session) => {
    const source: ActivitySource =
      hasNonEmptyString(session.deviceId) ? 'VINE_SIM' : 'MANUAL_LOOKUP';
    const kind: ActivityKind = 'SIMULATED_TRANSACTION';
    const occurredAt = session.createdAt;
    const statementPeriod = deriveStatementPeriod(occurredAt);
    const hasSessionAmount =
      session.amountCents !== null &&
      session.amountCents !== undefined &&
      !Number.isNaN(session.amountCents) &&
      session.amountCents !== 0;
    const cashDeltaCents = hasSessionAmount ? session.amountCents * -1 : null;

    return {
      id: `session-${session.id}`,
      source,
      kind,
      origin: 'SIMULATED',
      occurredAt,
      cashDeltaCents,
      amount: session.amountCents / 100,
      currency: session.currency,
      direction: 'DEBIT',
      merchantName: session.merchantName ?? null,
      mcc: session.mccCode ?? null,
      cardBrand: session.recommendedCard?.network ?? null,
      cardLast4: null,
      cardName: session.recommendedCard?.nickname ?? null,
      cardId: session.recommendedCard?.id ?? null,
      pointsDelta: null,
      bucketId: session.recommendedBucketId ?? null,
      rewardCategory: session.category ?? null,
      statementPeriod,
    };
  });

  const combined = [...bankRows, ...simulatedRows, ...ledgerRows, ...recommendationRows];
  const filtered = combined.filter((row) => {
    if (
      options?.sourceFilter !== undefined &&
      options.sourceFilter !== null &&
      options.sourceFilter.length > 0 &&
      !options.sourceFilter.includes(row.source)
    ) {
      return false;
    }
    if (periodRange) {
      const occurred = row.occurredAt;
      if (occurred < periodRange.start || occurred >= periodRange.end) return false;
    }
    return true;
  });

  filtered.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

  if (process.env.NODE_ENV === 'development') {
    const kindCounts = filtered.reduce<Record<ActivityKind, number>>(
      (acc, row) => {
        acc[row.kind] = (acc[row.kind] ?? 0) + 1;
        return acc;
      },
      { REAL_TRANSACTION: 0, SIMULATED_TRANSACTION: 0, POINTS_EVENT: 0, OTHER: 0 },
    );
    // eslint-disable-next-line no-console
    console.log('[activity:kindCounts]', kindCounts);
  }

  return filtered.slice(0, limit);
}

export async function getDevActivityEvents(userId: string): Promise<UnifiedActivityRow[]> {
  return getUnifiedActivityForUser(userId);
}

export async function getUserActivityLedger(userId: string): Promise<UnifiedActivityRow[]> {
  const rows = await getUnifiedActivityForUser(userId);
  return rows.filter((row) => row.origin === 'REAL');
}

export async function getUserRealActivityForPeriod(
  userId: string,
  period: { year: number; month: number },
): Promise<UnifiedActivityRow[]> {
  const rows = await getUnifiedActivityForUser(userId, {
    periodFilter: period,
    sourceFilter: ['BANK_FEED', 'STATEMENT_VIEW'],
  });
  return rows.filter((row) => row.origin === 'REAL');
}
