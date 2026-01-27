import type {
  BankTxn,
  BankTxnListOptions,
  BankTxnStore,
  BankTxnDirection,
  IdempotencyRecord,
  IdempotencyStore,
  LedgerAppendInput,
  LedgerEntry,
  LedgerStore,
  LedgerStatus,
  SessionCreateInput,
  SessionRecord,
  SessionStore,
  SessionStatus,
  SessionUpdateInput,
} from '../persistence.js';
import type {
  Prisma,
  PrismaClient,
  RecommendationStatus,
  CherryPointLedgerStatus,
  BankTransaction,
} from '@prisma/client';

type SessionRow = {
  id: string;
  userId: string;
  status: RecommendationStatus;
  createdAt: Date;
  updatedAt: Date;
};

type LedgerRow = {
  id: string;
  userId: string;
  sessionId: string | null;
  points: number;
  status: CherryPointLedgerStatus;
  createdAt: Date;
};

function mapSessionStatus(status: RecommendationStatus): SessionStatus {
  switch (status) {
    case 'RECOMMENDED':
      return 'PENDING';
    case 'CLAIMED':
      return 'ACTIVE';
    case 'VERIFIED':
    case 'REJECTED':
    case 'EXPIRED':
      return 'FINAL';
  }
}

function mapSessionStatusToDb(status: SessionStatus): RecommendationStatus {
  switch (status) {
    case 'PENDING':
      return 'RECOMMENDED';
    case 'ACTIVE':
      return 'CLAIMED';
    case 'FINAL':
      return 'VERIFIED';
  }
}

function mapLedgerStatus(status: CherryPointLedgerStatus): LedgerStatus {
  switch (status) {
    case 'PENDING':
      return 'PENDING';
    case 'POSTED':
      return 'POSTED';
    case 'REVOKED':
      return 'VOID';
  }
}

function mapLedgerStatusToDb(status: LedgerStatus): CherryPointLedgerStatus {
  switch (status) {
    case 'PENDING':
      return 'PENDING';
    case 'POSTED':
      return 'POSTED';
    case 'VOID':
      return 'REVOKED';
  }
}

function mapSessionRow(row: SessionRow): SessionRecord {
  return {
    id: row.id,
    userId: row.userId,
    status: mapSessionStatus(row.status),
    createdAtMs: row.createdAt.getTime(),
    updatedAtMs: row.updatedAt.getTime(),
  };
}

function mapLedgerRow(row: LedgerRow): LedgerEntry {
  return {
    id: row.id,
    userId: row.userId,
    sessionId: row.sessionId,
    points: row.points,
    status: mapLedgerStatus(row.status),
    createdAtMs: row.createdAt.getTime(),
  };
}

function normalizeBankTxnDirection(direction: string): BankTxnDirection {
  const normalized = direction.trim().toUpperCase();
  return normalized === 'IN' ? 'IN' : 'OUT';
}

function mapBankTxn(row: BankTransaction): BankTxn {
  return {
    id: row.id,
    userId: row.userId,
    amountMinor: row.amountMinor,
    direction: normalizeBankTxnDirection(row.direction),
    description: row.description ?? '',
    rawDescription: row.rawDescription ?? null,
    postedAtMs: row.postedAt !== null ? row.postedAt.getTime() : null,
    occurredAtMs: row.occurredAt !== null ? row.occurredAt.getTime() : null,
    mcc: row.mcc !== null && row.mcc !== undefined ? String(row.mcc) : null,
    source: row.source,
  };
}

export type PrismaStores = {
  sessions: SessionStore;
  ledger: LedgerStore;
  bank: BankTxnStore;
  idempotency: IdempotencyStore;
};

export function buildPrismaStores(prisma: PrismaClient): PrismaStores {
  const sessions: SessionStore = {
    getById: async (id) => {
      const row = await prisma.recommendationSession.findUnique({
        where: { id },
        select: { id: true, userId: true, status: true, createdAt: true, updatedAt: true },
      });
      if (row === null) return null;
      return mapSessionRow(row);
    },
    listForUser: async (userId) => {
      const rows = await prisma.recommendationSession.findMany({
        where: { userId },
        select: { id: true, userId: true, status: true, createdAt: true, updatedAt: true },
      });
      return rows.map(mapSessionRow);
    },
    create: async (input: SessionCreateInput) => {
      const metadata = (input.metadata ?? {}) as Record<string, unknown>;
      const { user: _user, ...rest } = metadata;
      void _user;
      const data = rest as Prisma.RecommendationSessionUncheckedCreateInput;
      const created = await prisma.recommendationSession.create({
        data: {
          ...data,
          userId: input.userId,
          status: mapSessionStatusToDb(input.status),
        },
        select: { id: true, userId: true, status: true, createdAt: true, updatedAt: true },
      });
      return mapSessionRow(created);
    },
    update: async (id: string, input: SessionUpdateInput) => {
      const metadata = (input.metadata ?? {}) as Record<string, unknown>;
      const { user: _user, userId: _userId, ...rest } = metadata;
      void _user;
      void _userId;
      const data = rest as Prisma.RecommendationSessionUncheckedUpdateInput;
      const updated = await prisma.recommendationSession.update({
        where: { id },
        data: {
          ...data,
          ...(input.status !== undefined ? { status: mapSessionStatusToDb(input.status) } : {}),
        },
        select: { id: true, userId: true, status: true, createdAt: true, updatedAt: true },
      });
      return mapSessionRow(updated);
    },
  };

  const ledger: LedgerStore = {
    append: async (input: LedgerAppendInput) => {
      const metadata = (input.metadata ?? {}) as Record<string, unknown>;
      const { user: _user, session: _session, ...rest } = metadata;
      void _user;
      void _session;
      const data = rest as Prisma.CherryPointLedgerUncheckedCreateInput;
      const created = await prisma.cherryPointLedger.create({
        data: {
          ...data,
          userId: input.userId,
          sessionId: input.sessionId ?? null,
          points: input.points,
          status: mapLedgerStatusToDb(input.status),
        },
        select: { id: true, userId: true, sessionId: true, points: true, status: true, createdAt: true },
      });
      return mapLedgerRow(created);
    },
    listForSession: async (sessionId: string) => {
      const rows = await prisma.cherryPointLedger.findMany({
        where: { sessionId },
        select: { id: true, userId: true, sessionId: true, points: true, status: true, createdAt: true },
      });
      return rows.map(mapLedgerRow);
    },
    listForUser: async (userId: string) => {
      const rows = await prisma.cherryPointLedger.findMany({
        where: { userId },
        select: { id: true, userId: true, sessionId: true, points: true, status: true, createdAt: true },
      });
      return rows.map(mapLedgerRow);
    },
  };

  const bank: BankTxnStore = {
    listForUser: async (userId: string, options?: BankTxnListOptions) => {
      const where: Prisma.BankTransactionWhereInput = { userId };
      const sources = options?.source;
      if (sources !== undefined && sources.length > 0) {
        where.source = { in: sources };
      }
      const orderBy =
        options?.orderByPostedAt !== undefined
          ? { postedAt: options.orderByPostedAt }
          : undefined;
      const rows = await prisma.bankTransaction.findMany({
        where,
        ...(orderBy !== undefined ? { orderBy } : {}),
      });
      return rows.map(mapBankTxn);
    },
  };

  const idempotency: IdempotencyStore = {
    get: async (userId: string, key: string) => {
      const row = await prisma.idempotencyKey.findUnique({
        where: { userId_key: { userId, key } },
      });
      if (row === null) return null;
      return {
        key: row.key,
        userId: row.userId,
        createdAtMs: row.createdAt.getTime(),
        payload: row.payload as Record<string, unknown>,
      };
    },
    put: async (record: IdempotencyRecord) => {
      await prisma.idempotencyKey.create({
        data: {
          key: record.key,
          userId: record.userId,
          createdAt: new Date(record.createdAtMs),
          payload: record.payload as Prisma.InputJsonValue,
        },
      });
    },
  };

  return { sessions, ledger, bank, idempotency };
}
