/* Simple Prisma client mock for test runs (no external database). */
import * as fs from 'node:fs';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import type { Module as NodeModuleType } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { fail } from '../guardrails/lib/fail.mjs';
import { ensureTsEsm } from './ensure-ts-esm.mjs';
import { asMessage } from '../guardrails/lib/error.mjs';

ensureTsEsm();

declare global {
  var __PRISMA_CLIENT_MOCK__: Record<string, unknown> | undefined;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type Where = Record<string, unknown>;

const requireFn = createRequire(import.meta.url);
const ModuleInternal = requireFn('node:module') as ModuleWithInternals;

type ModuleWithInternals = {
  new (id: string): NodeModuleType;
  _cache: Record<string, NodeModuleType>;
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
        const err = Error(
          `Unique constraint failed on the fields: (${name}.id)`
        ) as Error & {
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
      if (orderBy !== undefined) {
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
      if (existing === null) throw Error(`Record not found in ${name}`);
      const key = resolveKey(where) ?? (existing['id'] as string);
      const updated = { ...existing, ...data };
      store.set(key, updated);
      return updated;
    },
    upsert: async ({ where, create, update }: { where: Where; create: RecordShape; update: RecordShape }) => {
      const existing = await api.findUnique({ where });
      if (existing !== null) {
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
      if (_sum !== undefined) {
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
  rewardRule = createCollection('rewardRule');
  bucket = createCollection('bucket');
  categoryPreference = createCollection('categoryPreference');
  mccToRewardCategory = createCollection('mccToRewardCategory');
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
    return Promise.resolve();
  }
}

function buildEnum(values: string[]) {
  return values.reduce((acc, val) => {
    acc[val] = val;
    return acc;
  }, {} as Record<string, string>);
}

function parseEnumsFromSchema(): Record<string, Record<string, string>> {
  const schemaPath = path.resolve(__dirname, '..', '..', 'prisma', 'schema.prisma');
  if (!fs.existsSync(schemaPath)) return {};
  const text = fs.readFileSync(schemaPath, 'utf8');
  const enums: Record<string, string[]> = {};
  let current: string | null = null;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    const startMatch = line.match(/^enum\s+([A-Za-z0-9_]+)\s*\{/);
    if (startMatch !== null) {
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
      if (valueMatch !== null) {
        const value = valueMatch[1];
        if (typeof value === 'string') {
          const bucket = enums[current];
          if (bucket !== undefined) {
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
  if (PrismaEnums[name] === undefined) {
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
const originalResolveFilename = ModuleInternal._resolveFilename;
const originalLoad = ModuleInternal._load;
let resolvedPrismaPath = '@prisma/client';
let resolvedLookup: unknown;
try {
  resolvedLookup = originalResolveFilename.call(ModuleInternal, '@prisma/client', {
    id: '',
    filename: '',
  });
} catch (error: unknown) {
  void error;
  resolvedLookup = '@prisma/client';
}
if (typeof resolvedLookup === 'string' && resolvedLookup.length > 0) {
  resolvedPrismaPath = resolvedLookup;
}

const mockExports = {
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
} as Record<string, unknown>;
mockExports['default'] = mockExports;
mockExports['__esModule'] = true;
globalThis.__PRISMA_CLIENT_MOCK__ = mockExports;

const mockModule = new ModuleInternal(resolvedPrismaPath) as NodeModuleType;
mockModule.filename = resolvedPrismaPath;
mockModule.loaded = true;
mockModule.exports = mockExports;

requireFn.cache['@prisma/client'] = mockModule;
requireFn.cache[resolvedPrismaPath] = mockModule;
ModuleInternal._cache['@prisma/client'] = mockModule;
ModuleInternal._cache[resolvedPrismaPath] = mockModule;

const exportNames = Object.keys(mockExports).filter((key) => {
  if (key === 'default' || key === '__esModule') return false;
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key);
});
const esmSource = [
  'const mock = globalThis.__PRISMA_CLIENT_MOCK__;',
  'export default mock;',
  ...exportNames.map((name) => `export const ${name} = mock.${name};`),
].join('\n');
const prismaDataUrl = `data:text/javascript;base64,${Buffer.from(esmSource, 'utf8').toString('base64')}`;
const SENTINEL_SCHEME = 'cherry-loader-test://';
const SENTINEL_OK_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'tests',
  'fixtures',
  'loader',
  'sentinel-ok.ts',
);
const SENTINEL_FALLBACK_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'tests',
  'fixtures',
  'loader',
  'sentinel-fallback.ts',
);
const LOADER_FAIL_CODE = 'PRISMA_MOCK_LOADER_TOTALITY_VIOLATION';

function isValidSource(source: unknown): source is string | ArrayBuffer | ArrayBufferView {
  if (typeof source === 'string') return true;
  if (source instanceof ArrayBuffer) return true;
  return ArrayBuffer.isView(source);
}

function isThenable(value: unknown): value is Promise<unknown> {
  return typeof value === 'object' && value !== null && 'then' in value;
}

function loadSourceFromFile(url: string): ArrayBufferView | null {
  if (!url.startsWith('file:')) return null;
  try {
    const filePath = fileURLToPath(url);
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath);
  } catch (error: unknown) {
    void asMessage(error);
    return null;
  }
}

function assertLoadResult(
  url: string,
  result: unknown,
  note: string
): { format?: string | null; source?: string | ArrayBuffer | ArrayBufferView; shortCircuit?: boolean } {
  if (result === undefined) {
    fail(LOADER_FAIL_CODE, 'load() returned undefined result', {
      details: [`url=${url}`, `note=${note}`],
      fix: 'All load() paths must return { format, source } or delegate to defaultLoad().',
    });
  }
  if (isThenable(result)) {
    fail(LOADER_FAIL_CODE, 'load() returned a Promise in sync hook', {
      details: [`url=${url}`, `note=${note}`],
      fix: 'Sync hooks must return a plain object with format/source.',
    });
  }
  if (result === null || typeof result !== 'object') {
    fail(LOADER_FAIL_CODE, 'load() returned a non-object result', {
      details: [`url=${url}`, `note=${note}`],
      fix: 'All load() paths must return { format, source } or delegate to defaultLoad().',
    });
  }
  const normalized = result as {
    format?: string | null;
    source?: string | ArrayBuffer | ArrayBufferView;
    shortCircuit?: boolean;
  };
  const { source, format } = normalized;
  if (format === 'commonjs' && source == null) {
    const fileSource = loadSourceFromFile(url);
    if (fileSource !== null) {
      return { ...normalized, source: fileSource };
    }
    fail(LOADER_FAIL_CODE, 'load() returned missing source for commonjs module', {
      details: [`url=${url}`],
      fix: 'All load() paths must return { format, source } or delegate to defaultLoad().',
    });
  }
  if (!url.startsWith('node:') && format !== 'addon' && !isValidSource(source)) {
    fail(LOADER_FAIL_CODE, 'load() returned invalid source', {
      details: [`url=${url}`, `format=${String(format ?? 'undefined')}`],
      fix: 'All load() paths must return { format, source } or delegate to defaultLoad().',
    });
  }
  return normalized;
}

function shouldLogLoaderDebug(): boolean {
  return process.env['CHERRY_DEBUG_LOADER'] === '1';
}

function resolveSentinel(specifier: string): string | null {
  const testMode = process.env['CHERRY_TEST_LOADER_SENTINEL'] === '1';
  if (!testMode || !specifier.startsWith(SENTINEL_SCHEME)) return null;
  const suffix = specifier.slice(SENTINEL_SCHEME.length);
  const target = suffix === 'ok' ? SENTINEL_OK_PATH : SENTINEL_FALLBACK_PATH;
  return pathToFileURL(target).href;
}

function isPrismaSpecifier(specifier: string): boolean {
  return specifier === '@prisma/client';
}

function isPrismaRuntime(url: string): boolean {
  return (
    url.includes('/@prisma/client') ||
    url.includes('/.prisma/client') ||
    url.includes('prisma/runtime')
  );
}

export async function resolve(
  specifier: string,
  context: { parentURL?: string },
  nextResolve: (specifier: string, context: { parentURL?: string }) => Promise<{ url: string }>
): Promise<{ url: string; shortCircuit?: boolean }> {
  if (isPrismaSpecifier(specifier)) {
    return { url: prismaDataUrl, shortCircuit: true };
  }
  const sentinelUrl = resolveSentinel(specifier);
  if (sentinelUrl !== null) {
    return { url: sentinelUrl, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}

export function resolveSync(
  specifier: string,
  context: { parentURL?: string },
  nextResolve: (specifier: string, context: { parentURL?: string }) => { url: string }
): { url: string; shortCircuit?: boolean } {
  if (isPrismaSpecifier(specifier)) {
    return { url: prismaDataUrl, shortCircuit: true };
  }
  const sentinelUrl = resolveSentinel(specifier);
  if (sentinelUrl !== null) {
    return { url: sentinelUrl, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}

export async function load(
  url: string,
  context: {
    format?: string | null;
    importAttributes?: Record<string, unknown>;
    conditions?: string[];
  },
  defaultLoad: (
    url: string,
    context?: {
      format?: string | null;
      importAttributes?: Record<string, unknown>;
      conditions?: string[];
    }
  ) => Promise<{
    format?: string | null;
    source?: string | ArrayBuffer | ArrayBufferView;
    shortCircuit?: boolean;
  }>
): Promise<{
  format?: string | null;
  source?: string | ArrayBuffer | ArrayBufferView;
  shortCircuit?: boolean;
}> {
  if (process.env['NODE_ENV'] !== 'production' && typeof defaultLoad !== 'function') {
    fail(LOADER_FAIL_CODE, 'defaultLoad missing in dev', {
      fix: 'Invalid loader contract',
    });
  }
  if (!url.startsWith('file://')) {
    return defaultLoad(url, context);
  }
  try {
    if (isPrismaRuntime(url)) {
      if (!isValidSource(esmSource)) {
        fail(LOADER_FAIL_CODE, 'Prisma mock source invalid', {
          details: [`url=${url}`],
          fix: 'Ensure mock source is a valid string or buffer.',
        });
      }
      return { format: 'module', source: esmSource, shortCircuit: true };
    }

    if (typeof defaultLoad !== 'function') {
      fail(LOADER_FAIL_CODE, 'defaultLoad missing', {
        details: [`url=${url}`],
        fix: 'All load() paths must return { format, source } or delegate to defaultLoad().',
      });
    }
    const result = await defaultLoad(url, context);
    const normalized = assertLoadResult(url, result, 'default-delegate');
    if (normalized.source === undefined) {
      fail(LOADER_FAIL_CODE, 'ESM loader returned undefined', {
        details: [`url=${url}`],
        fix: 'All load() paths must return { format, source } or delegate to defaultLoad().',
      });
    }
    return normalized;
  } catch (err: unknown) {
    const message = asMessage(err);
    if (shouldLogLoaderDebug()) {
      process.stderr.write(`[loader] mock load error: ${message}\n`);
    }
    fail(LOADER_FAIL_CODE, 'load() threw', {
      details: [`url=${url}`, `error=${message}`],
      fix: 'Ensure loader is total and synchronous.',
    });
  }
}

export function loadSync(
  url: string,
  context: {
    format?: string | null;
    importAttributes?: Record<string, unknown>;
    conditions?: string[];
  },
  defaultLoad: (
    url: string,
    context?: {
      format?: string | null;
      importAttributes?: Record<string, unknown>;
      conditions?: string[];
    }
  ) => {
    format?: string | null;
    source?: string | ArrayBuffer | ArrayBufferView;
    shortCircuit?: boolean;
  }
): {
  format?: string | null;
  source?: string | ArrayBuffer | ArrayBufferView;
  shortCircuit?: boolean;
} {
  if (process.env['NODE_ENV'] !== 'production' && typeof defaultLoad !== 'function') {
    fail(LOADER_FAIL_CODE, 'defaultLoad missing in dev', {
      fix: 'Invalid loader contract',
    });
  }
  if (!url.startsWith('file://')) {
    return defaultLoad(url, context);
  }
  try {
    if (isPrismaRuntime(url)) {
      if (!isValidSource(esmSource)) {
        fail(LOADER_FAIL_CODE, 'Prisma mock source invalid', {
          details: [`url=${url}`],
          fix: 'Ensure mock source is a valid string or buffer.',
        });
      }
      return { format: 'module', source: esmSource, shortCircuit: true };
    }

    if (typeof defaultLoad !== 'function') {
      fail(LOADER_FAIL_CODE, 'defaultLoad missing', {
        details: [`url=${url}`],
        fix: 'All load() paths must return { format, source } or delegate to defaultLoad().',
      });
    }
    const result = defaultLoad(url, context);
    const normalized = assertLoadResult(url, result, 'default-delegate');
    if (normalized.source === undefined) {
      fail(LOADER_FAIL_CODE, 'ESM loader returned undefined', {
        details: [`url=${url}`],
        fix: 'All load() paths must return { format, source } or delegate to defaultLoad().',
      });
    }
    return normalized;
  } catch (err: unknown) {
    const message = asMessage(err);
    if (shouldLogLoaderDebug()) {
      process.stderr.write(`[loader] mock load error: ${message}\n`);
    }
    fail(LOADER_FAIL_CODE, 'load() threw', {
      details: [`url=${url}`, `error=${message}`],
      fix: 'Ensure loader is total and synchronous.',
    });
  }
}

ModuleInternal._load = function (...args: [string, unknown, boolean]) {
  const [request] = args;
  if (request === '@prisma/client' || (typeof request === 'string' && request.includes('@prisma/client'))) {
    return mockModule.exports;
  }
  return originalLoad.apply(this, args);
};
