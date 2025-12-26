/* Simple Prisma client mock for test runs (no external database). */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import type { Module as NodeModuleType } from 'node:module';

type Where = Record<string, unknown>;

const requireFn = createRequire(import.meta.url);
requireFn('ts-node/register/transpile-only');

type ModuleWithInternals = {
  _resolveFilename: (...args: [string, unknown]) => string;
  _load: (...args: [string, unknown, boolean]) => unknown;
};

class MockDecimal {
  private value: number;
  constructor(value: string | number | bigint) {
    this.value = Number(value);
  }
  dividedBy(other: MockDecimal | number | string | bigint): MockDecimal {
    const divisor = other instanceof MockDecimal ? other.value : Number(other);
    return new MockDecimal(this.value / divisor);
  }
  toNumber(): number {
    return this.value;
  }
  toString(): string {
    return String(this.value);
  }
}

type RecordShape = Record<string, unknown>;

function matchesWhere(record: RecordShape, where?: Where): boolean {
  if (where === undefined || Object.keys(where).length === 0) return true;
  return Object.entries(where).every(([key, val]) => {
    if (
      val !== null &&
      typeof val === 'object' &&
      'userId' in (val as Record<string, unknown>) &&
      'key' in (val as Record<string, unknown>)
    ) {
      const composite = val as { userId: string; key: string };
      return record['userId'] === composite.userId && record['key'] === composite.key;
    }
    if (
      val !== null &&
      typeof val === 'object' &&
      'userId' in (val as Record<string, unknown>) &&
      'externalId' in (val as Record<string, unknown>)
    ) {
      const composite = val as { userId: string; externalId: string };
      return (
        record['userId'] === composite.userId &&
        record['externalId'] === composite.externalId
      );
    }
    return record[key] === val;
  });
}

function createCollection(name: string) {
  const store = new Map<string, RecordShape>();
  let counter = 1;

  function resolveKey(where: Where): string | null {
    if ('id' in where && typeof where['id'] === 'string') return where['id'] as string;
    if ('userId_key' in where) {
      const composite = where['userId_key'] as { userId: string; key: string };
      return `${composite.userId}:${composite.key}`;
    }
    if ('userId_externalId' in where) {
      const composite = where['userId_externalId'] as { userId: string; externalId: string };
      return `${composite.userId}:${composite.externalId}`;
    }
    if (
      'userId' in where &&
      'key' in where &&
      typeof where['userId'] === 'string' &&
      typeof where['key'] === 'string'
    ) {
      return `${where['userId']}:${where['key']}`;
    }
    if (
      'userId' in where &&
      'externalId' in where &&
      typeof where['userId'] === 'string' &&
      typeof where['externalId'] === 'string'
    ) {
      return `${where['userId']}:${where['externalId']}`;
    }
    return null;
  }

  const api = {
    create: async ({ data }: { data: RecordShape }) => {
      const compositeKey =
        typeof data['userId'] === 'string' && typeof data['key'] === 'string'
          ? `${data['userId']}:${data['key']}`
          : null;
      const key =
        (data['id'] as string | undefined) ?? compositeKey ?? `${name}-${counter++}`;
      if (store.has(key)) {
        const err = new Error(`Unique constraint failed on the fields: (${name}.id)`) as Error & {
          code?: string;
        };
        err.code = 'P2002';
        throw err;
      }
      const record = { ...data, id: key };
      store.set(key, record);
      return record;
    },
    createMany: async ({ data }: { data: RecordShape[] }) => {
      await Promise.all(data.map((entry) => api.create({ data: entry })));
      return { count: data.length };
    },
    findUnique: async ({ where }: { where: Where }) => {
      const key = resolveKey(where);
      if (key !== null && store.has(key)) return store.get(key) ?? null;
      for (const record of store.values()) {
        if (matchesWhere(record, where)) return record;
      }
      return null;
    },
    findMany: async ({ where }: { where?: Where } = {}) => {
      return Array.from(store.values()).filter((record) => matchesWhere(record, where));
    },
    findFirst: async ({ where, orderBy }: { where?: Where; orderBy?: Record<string, 'asc' | 'desc'> } = {}) => {
      const results = await api.findMany(where === undefined ? {} : { where });
      if (orderBy) {
        const [key, dir] = Object.entries(orderBy)[0] ?? [];
        if (typeof key === 'string' && key.length > 0) {
          results.sort((a, b) => {
            const av = (a as Record<string, number | string | Date | undefined>)[key];
            const bv = (b as Record<string, number | string | Date | undefined>)[key];
            const an = av instanceof Date ? av.getTime() : (av as number);
            const bn = bv instanceof Date ? bv.getTime() : (bv as number);
            if (Number.isFinite(an) && Number.isFinite(bn)) {
              return dir === 'desc' ? bn - an : an - bn;
            }
            return 0;
          });
        }
      }
      return results[0] ?? null;
    },
    update: async ({ where, data }: { where: Where; data: RecordShape }) => {
      const existing = await api.findUnique({ where });
      if (!existing) throw new Error(`Record not found in ${name}`);
      const key = resolveKey(where) ?? (existing['id'] as string);
      const updated = { ...existing, ...data };
      store.set(key, updated);
      return updated;
    },
    upsert: async ({ where, create, update }: { where: Where; create: RecordShape; update: RecordShape }) => {
      const existing = await api.findUnique({ where });
      if (existing) {
        return api.update({ where, data: { ...existing, ...update } });
      }
      const data = { ...create };
      const key = resolveKey(where);
      if (key !== null && data['id'] === undefined) {
        data['id'] = key;
      }
      return api.create({ data });
    },
    deleteMany: async ({ where }: { where: Where }) => {
      let count = 0;
      for (const [key, record] of Array.from(store.entries())) {
        if (matchesWhere(record, where)) {
          store.delete(key);
          count += 1;
        }
      }
      return { count };
    },
    count: async ({ where }: { where?: Where } = {}) => {
      const records = await api.findMany(where === undefined ? {} : { where });
      return records.length;
    },
    aggregate: async ({ where, _sum }: { where?: Where; _sum?: Record<string, boolean> }) => {
      const records = await api.findMany(where === undefined ? {} : { where });
      const result: Record<string, number | null> = {};
      if (_sum) {
        for (const key of Object.keys(_sum)) {
          const sum = records.reduce((acc, record) => {
            const value = (record as Record<string, unknown>)[key];
            const numeric = typeof value === 'number' ? value : 0;
            return acc + numeric;
          }, 0);
          result[key] = sum;
        }
      }
      return { _sum: result };
    },
  };

  return api;
}

class MockPrismaClient {
  user = createCollection('user');
  bankTransaction = createCollection('bankTransaction');
  card = createCollection('card');
  bucket = createCollection('bucket');
  categoryPreference = createCollection('categoryPreference');
  dailyState = createCollection('dailyState');
  historicalEngineEvaluation = createCollection('historicalEngineEvaluation');
  historicalIncomeRegime = createCollection('historicalIncomeRegime');
  historicalBucketTemplate = createCollection('historicalBucketTemplate');
  recommendationSession = createCollection('recommendationSession');
  cherryPointLedger = createCollection('cherryPointLedger');
  simulation = createCollection('simulation');
  vineDevice = createCollection('vineDevice');
  decisionEvent = createCollection('decisionEvent');
  idempotencyKey = createCollection('idempotencyKey');

  async $disconnect(): Promise<void> {
    return;
  }
}

function buildEnum(values: string[]) {
  return values.reduce((acc, val) => {
    acc[val] = val;
    return acc;
  }, {} as Record<string, string>);
}

function parseEnumsFromSchema(): Record<string, Record<string, string>> {
  const schemaPath = path.resolve(__dirname, '..', 'prisma', 'schema.prisma');
  if (!fs.existsSync(schemaPath)) return {};
  const text = fs.readFileSync(schemaPath, 'utf8');
  const enums: Record<string, string[]> = {};
  let current: string | null = null;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    const startMatch = line.match(/^enum\s+([A-Za-z0-9_]+)\s*\{/);
    if (startMatch) {
      const enumName = startMatch[1];
      if (typeof enumName !== 'string') {
        current = null;
        continue;
      }
      current = enumName;
      enums[current] = [];
      continue;
    }
    if (current !== null && line.startsWith('}')) {
      current = null;
      continue;
    }
    if (current !== null) {
      const valueMatch = line.match(/^([A-Z0-9_]+)/);
      if (valueMatch) {
        const value = valueMatch[1];
        if (typeof value === 'string') {
          const bucket = enums[current];
          if (bucket) {
            bucket.push(value);
          }
        }
      }
    }
  }
  return Object.fromEntries(
    Object.entries(enums).map(([name, values]) => [name, buildEnum(values)])
  );
}

const PrismaEnums = parseEnumsFromSchema();

function ensureEnum(name: string, values: string[]): void {
  if (!PrismaEnums[name]) {
    PrismaEnums[name] = buildEnum(values);
  }
}

ensureEnum('RewardCategory', ['DINING', 'GROCERIES', 'GAS', 'TRAVEL', 'OTHER']);
ensureEnum('CategoryCoverageModeDb', ['BUDGETED', 'UNBUDGETED_INTENTIONAL', 'UNCONFIGURED']);
ensureEnum('BudgetVerdict', ['GREEN', 'YELLOW', 'RED', 'UNKNOWN', 'INSUFFICIENT_DATA']);
ensureEnum('CardVerdict', ['GREEN', 'YELLOW', 'RED', 'UNKNOWN', 'INSUFFICIENT_DATA']);
ensureEnum('OverallVerdict', ['GREEN', 'YELLOW', 'RED', 'UNKNOWN', 'INSUFFICIENT_DATA']);
ensureEnum('RecommendationStatus', ['PENDING', 'CONFIRMED', 'REJECTED']);

class MockPrismaClientKnownRequestError extends Error {
  code?: string;
  meta?: unknown;
  constructor(message: string, code?: string, meta?: unknown) {
    super(message);
    if (code !== undefined) {
      this.code = code;
    }
    if (meta !== undefined) {
      this.meta = meta;
    }
  }
}

// Register mock in require cache for any import of '@prisma/client'.
const Module = requireFn('module') as ModuleWithInternals;
const originalResolveFilename = Module._resolveFilename;
const originalLoad = Module._load;
let resolvedPrismaPath = '@prisma/client';
let resolvedLookup: unknown;
try {
  resolvedLookup = originalResolveFilename.call(Module, '@prisma/client', {
    id: '',
    filename: '',
  });
} catch {
  resolvedLookup = '@prisma/client';
}
if (typeof resolvedLookup === 'string' && resolvedLookup.length > 0) {
  resolvedPrismaPath = resolvedLookup;
}

const mockModule = {
  id: resolvedPrismaPath,
  filename: resolvedPrismaPath,
  loaded: true,
  exports: {
    PrismaClient: MockPrismaClient,
    PrismaClientKnownRequestError: MockPrismaClientKnownRequestError,
    Prisma: {
      Decimal: MockDecimal,
      PrismaClientKnownRequestError: MockPrismaClientKnownRequestError,
      ...PrismaEnums,
      $Enums: PrismaEnums,
    },
    $Enums: PrismaEnums,
    ...PrismaEnums,
  },
} as unknown as NodeModuleType;

require.cache['@prisma/client'] = mockModule;
require.cache[resolvedPrismaPath] = mockModule;

Module._load = function (...args: [string, unknown, boolean]) {
  const [request] = args;
  if (request === '@prisma/client' || (typeof request === 'string' && request.includes('@prisma/client'))) {
    return mockModule.exports;
  }
  return originalLoad.apply(this, args);
};
