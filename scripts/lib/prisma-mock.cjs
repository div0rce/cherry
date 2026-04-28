/* Simple Prisma client mock for test runs (no external database). */
const fs = require('node:fs');
const path = require('node:path');

class MockDecimal {
  constructor(value) {
    this.value = Number(value);
  }
  dividedBy(other) {
    const divisor = other instanceof MockDecimal ? other.value : Number(other);
    return new MockDecimal(this.value / divisor);
  }
  toNumber() {
    return this.value;
  }
  toString() {
    return String(this.value);
  }
}

function matchesWhere(record, where) {
  if (where === undefined || Object.keys(where).length === 0) return true;
  return Object.entries(where).every(([key, val]) => {
    if (
      val !== null &&
      typeof val === 'object' &&
      'userId' in val &&
      'key' in val
    ) {
      return record.userId === val.userId && record.key === val.key;
    }
    if (
      val !== null &&
      typeof val === 'object' &&
      'userId' in val &&
      'externalId' in val
    ) {
      return record.userId === val.userId && record.externalId === val.externalId;
    }
    if (
      val !== null &&
      typeof val === 'object' &&
      'scopeKey' in val &&
      'runId' in val &&
      'classifierVersion' in val
    ) {
      return (
        record.scopeKey === val.scopeKey &&
        record.runId === val.runId &&
        record.classifierVersion === val.classifierVersion
      );
    }
    return record[key] === val;
  });
}

function createCollection(name) {
  const store = new Map();
  let counter = 1;

  function resolveKey(where) {
    if ('id' in where && typeof where.id === 'string') return where.id;
    if ('userId_key' in where) {
      const composite = where.userId_key;
      return `${composite.userId}:${composite.key}`;
    }
    if ('userId_externalId' in where) {
      const composite = where.userId_externalId;
      return `${composite.userId}:${composite.externalId}`;
    }
    if ('scopeKey_runId_classifierVersion' in where) {
      const composite = where.scopeKey_runId_classifierVersion;
      return `${composite.scopeKey}:${composite.runId}:${composite.classifierVersion}`;
    }
    if (
      'userId' in where &&
      'key' in where &&
      typeof where.userId === 'string' &&
      typeof where.key === 'string'
    ) {
      return `${where.userId}:${where.key}`;
    }
    if (
      'userId' in where &&
      'externalId' in where &&
      typeof where.userId === 'string' &&
      typeof where.externalId === 'string'
    ) {
      return `${where.userId}:${where.externalId}`;
    }
    return null;
  }

  const api = {
    create: async ({ data }) => {
      const compositeKey =
        typeof data.userId === 'string' && typeof data.key === 'string'
          ? `${data.userId}:${data.key}`
          : null;
      const simulationKey =
        typeof data.scopeKey === 'string' &&
        typeof data.runId === 'string' &&
        typeof data.classifierVersion === 'string'
          ? `${data.scopeKey}:${data.runId}:${data.classifierVersion}`
          : null;
      const key = data.id ?? compositeKey ?? simulationKey ?? `${name}-${counter++}`;
      if (store.has(key)) {
        const err = new Error(`Unique constraint failed on the fields: (${name}.id)`);
        err.code = 'P2002';
        throw err;
      }
      const record = { ...data, id: key };
      store.set(key, record);
      return record;
    },
    createMany: async ({ data }) => {
      await Promise.all(data.map((entry) => api.create({ data: entry })));
      return { count: data.length };
    },
    findUnique: async ({ where }) => {
      const key = resolveKey(where);
      if (key !== null && store.has(key)) return store.get(key) ?? null;
      for (const record of store.values()) {
        if (matchesWhere(record, where)) return record;
      }
      return null;
    },
    findMany: async ({ where } = {}) => {
      return Array.from(store.values()).filter((record) => matchesWhere(record, where));
    },
    findFirst: async ({ where, orderBy } = {}) => {
      const results = await api.findMany(where === undefined ? {} : { where });
      if (orderBy) {
        const [key, dir] = Object.entries(orderBy)[0] ?? [];
        if (typeof key === 'string' && key.length > 0) {
          results.sort((a, b) => {
            const av = a[key];
            const bv = b[key];
            const an = av instanceof Date ? av.getTime() : av;
            const bn = bv instanceof Date ? bv.getTime() : bv;
            if (Number.isFinite(an) && Number.isFinite(bn)) {
              return dir === 'desc' ? bn - an : an - bn;
            }
            return 0;
          });
        }
      }
      return results[0] ?? null;
    },
    update: async ({ where, data }) => {
      const existing = await api.findUnique({ where });
      if (!existing) throw new Error(`Record not found in ${name}`);
      const key = resolveKey(where) ?? existing.id;
      const updated = { ...existing, ...data };
      store.set(key, updated);
      return updated;
    },
    upsert: async ({ where, create, update }) => {
      const existing = await api.findUnique({ where });
      if (existing) {
        return api.update({ where, data: { ...existing, ...update } });
      }
      const data = { ...create };
      const key = resolveKey(where);
      if (key !== null && data.id === undefined) {
        data.id = key;
      }
      return api.create({ data });
    },
    deleteMany: async ({ where }) => {
      let count = 0;
      for (const [key, record] of Array.from(store.entries())) {
        if (matchesWhere(record, where)) {
          store.delete(key);
          count += 1;
        }
      }
      return { count };
    },
    count: async ({ where } = {}) => {
      const records = await api.findMany(where === undefined ? {} : { where });
      return records.length;
    },
    aggregate: async ({ where, _sum }) => {
      const records = await api.findMany(where === undefined ? {} : { where });
      const result = {};
      if (_sum) {
        for (const key of Object.keys(_sum)) {
          const sum = records.reduce((acc, record) => {
            const value = record[key];
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
  scheduledPaydown = createCollection('scheduledPaydown');
  simulation = createCollection('simulation');
  vineDevice = createCollection('vineDevice');
  decisionEvent = createCollection('decisionEvent');
  automationEvent = createCollection('automationEvent');
  simulationAutomationSnapshot = createCollection('simulationAutomationSnapshot');
  automationStatusCheck = createCollection('automationStatusCheck');
  idempotencyKey = createCollection('idempotencyKey');

  async $disconnect() {
    return;
  }
}

function buildEnum(values) {
  return values.reduce((acc, val) => {
    acc[val] = val;
    return acc;
  }, {});
}

function parseEnumsFromSchema() {
  const schemaPath = path.resolve(__dirname, '..', '..', 'prisma', 'schema.prisma');
  if (!fs.existsSync(schemaPath)) return {};
  const text = fs.readFileSync(schemaPath, 'utf8');
  const enums = {};
  let current = null;
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

function ensureEnum(name, values) {
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
  constructor(message, code, meta) {
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
const Module = require('module');
const originalResolveFilename = Module._resolveFilename;
const originalLoad = Module._load;
let resolvedPrismaPath = '@prisma/client';
let resolvedLookup;
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
};

require.cache['@prisma/client'] = mockModule;
require.cache[resolvedPrismaPath] = mockModule;

Module._load = function (...args) {
  const [request] = args;
  if (request === '@prisma/client' || (typeof request === 'string' && request.includes('@prisma/client'))) {
    return mockModule.exports;
  }
  return originalLoad.apply(this, args);
};
