import { prisma } from '@/lib/prisma';

export type ActivitySource =
  | 'BANK_FEED'
  | 'STATEMENT_VIEW'
  | 'VINE_SIM'
  | 'MANUAL_LOOKUP'
  | 'OTHER_SIM';
export type UnifiedDirection = 'DEBIT' | 'CREDIT';

export interface UnifiedActivityRow {
  id: string;
  source: ActivitySource;
  occurredAt: Date;
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
  bucketId?: string | null;
  rewardCategory?: string | null;
  statementPeriod?:
    | {
        year: number;
        month: number;
      }
    | null;
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
          occurredAt: {
            gte: periodRange.start,
            lt: periodRange.end,
          },
        }
      : { userId };

  const [bankTx, ledger] = await Promise.all([
    includeBankSources
      ? prisma.bankTransaction.findMany({
          where: bankWhere,
          orderBy: { occurredAt: 'desc' },
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
  ]);

  const sourceFilter = options?.sourceFilter ?? null;
  const shouldTagAsStatement =
    !!sourceFilter &&
    sourceFilter.includes('STATEMENT_VIEW') &&
    !sourceFilter.includes('BANK_FEED');

  const bankRows: UnifiedActivityRow[] = bankTx.map((tx) => {
    let merchantLocation: UnifiedActivityRow['merchantLocation'];
    if (tx.merchantCity || tx.merchantRegion || tx.merchantCountry || tx.merchantObservation) {
      const location: NonNullable<UnifiedActivityRow['merchantLocation']> = {};
      const city = tx.merchantCity ?? tx.merchantObservation?.city;
      const region = tx.merchantRegion ?? tx.merchantObservation?.region;
      const country = tx.merchantCountry ?? tx.merchantObservation?.country;
      if (city) location.city = city;
      if (region) location.region = region;
      if (country) location.country = country;
      merchantLocation = location;
    }

    const occurredAt = tx.occurredAt;
    const statementPeriod = {
      year: occurredAt.getUTCFullYear(),
      month: occurredAt.getUTCMonth() + 1,
    };

    const base: UnifiedActivityRow = {
      id: `bank-${tx.id}`,
      source: shouldTagAsStatement ? 'STATEMENT_VIEW' : 'BANK_FEED',
      occurredAt,
      amount: Number(tx.amount),
      currency: tx.currency,
      direction: tx.direction === 'CREDIT' ? 'CREDIT' : 'DEBIT',
      merchantName: tx.merchantName ?? tx.merchantObservation?.merchantName ?? null,
      mcc: tx.mcc ?? tx.merchantObservation?.mcc ?? null,
      cardBrand: tx.cardBrand ?? null,
      cardLast4: tx.cardLast4 ?? null,
      cardName: null,
      cardId: null,
      rewardCategory: null,
      statementPeriod,
    };

    return merchantLocation ? { ...base, merchantLocation } : base;
  });

  const ledgerRows: UnifiedActivityRow[] = ledger.map((row) => {
    const session = row.session;
    const source: ActivitySource =
      session?.deviceId && session.deviceId.length > 0
        ? 'VINE_SIM'
        : session
          ? 'MANUAL_LOOKUP'
          : 'OTHER_SIM';

    let merchantLocation: UnifiedActivityRow['merchantLocation'];
    if (row.merchantObservation) {
      const location: NonNullable<UnifiedActivityRow['merchantLocation']> = {};
      if (row.merchantObservation.city) location.city = row.merchantObservation.city;
      if (row.merchantObservation.region) location.region = row.merchantObservation.region;
      if (row.merchantObservation.country) location.country = row.merchantObservation.country;
      merchantLocation = location;
    }

    const base: UnifiedActivityRow = {
      id: `ledger-${row.id}`,
      source,
      occurredAt: row.awardedAt ?? row.createdAt,
      amount: session?.amountCents ? session.amountCents / 100 : 0,
      currency: session?.currency ?? 'USD',
      direction: 'DEBIT',
      merchantName: session?.merchantName ?? row.merchantObservation?.merchantName ?? null,
      mcc: session?.mccCode ?? row.merchantObservation?.mcc ?? null,
      cardBrand: session?.recommendedCard?.network ?? null,
      cardLast4: null,
      cardName: session?.recommendedCard?.nickname ?? null,
      cardId: session?.recommendedCard?.id ?? null,
      pointsEarned: row.points,
      bucketId: session?.recommendedBucketId ?? null,
      rewardCategory: session?.category ?? null,
      statementPeriod: null,
    };

    return merchantLocation ? { ...base, merchantLocation } : base;
  });

  const combined = [...bankRows, ...ledgerRows];
  const filtered = combined.filter((row) => {
    if (options?.sourceFilter?.length && !options.sourceFilter.includes(row.source)) {
      return false;
    }
    if (periodRange) {
      const occurred = row.occurredAt;
      if (occurred < periodRange.start || occurred >= periodRange.end) return false;
    }
    return true;
  });

  filtered.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

  return filtered.slice(0, limit);
}
