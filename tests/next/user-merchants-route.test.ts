import * as assert from 'node:assert/strict';
import * as Module from 'node:module';
import { fileURLToPath } from 'node:url';

// GET /api/user/merchants: the query filter reaches Prisma, auth failures are 401, and backend
// failures are 500 (previously every error was 200 { names: [] } and the query was dropped).

const __filename = fileURLToPath(import.meta.url);
const requireModule = Module.createRequire(__filename);

function stub(specifier: string, exports: Record<string, unknown>): void {
  const resolved = requireModule.resolve(specifier);
  requireModule.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports } as NodeModule;
}

const { AppError } = requireModule('../../lib/errors') as {
  AppError: new (code: string, message: string, status: number) => Error;
};

let signedIn = true;
let findManyArgs: { where: Record<string, unknown>; distinct?: unknown } | null = null;
let findManyResult: () => Promise<Array<{ merchantName: string | null }>> = async () => [];

stub('../../lib/auth', { auth: async () => null });
stub('../../lib/user-context', {
  resolveUserContext: async () => {
    if (!signedIn) throw new AppError('UNAUTHORIZED', 'Unauthorized', 401);
    return { userId: 'user-1', mode: 'AUTHENTICATED', email: null };
  },
});
stub('../../lib/prisma', {
  prisma: {
    bankTransaction: {
      findMany: async (args: { where: Record<string, unknown>; distinct?: unknown }) => {
        findManyArgs = args;
        return findManyResult();
      },
    },
  },
});

const routePath = requireModule.resolve('../../app/api/user/merchants/route.ts');
delete requireModule.cache[routePath];
const { GET } = requireModule(routePath) as { GET: (request: Request) => Promise<Response> };

async function run(): Promise<void> {
  findManyResult = async () => [{ merchantName: 'Chipotle' }, { merchantName: null }];
  const ok = await GET(new Request('http://localhost/api/user/merchants?query=%20chip%20'));
  assert.equal(ok.status, 200);
  assert.deepEqual(await ok.json(), { names: ['Chipotle'] });
  assert.deepEqual(findManyArgs?.where, {
    userId: 'user-1',
    merchantName: { not: null, contains: 'chip', mode: 'insensitive' },
  });
  // No `distinct`: Prisma 6 applies it in memory, which drops the database-level LIMIT.
  assert.equal(findManyArgs?.distinct, undefined);

  await GET(new Request('http://localhost/api/user/merchants'));
  assert.deepEqual(findManyArgs?.where, { userId: 'user-1', merchantName: { not: null } });

  signedIn = false;
  assert.equal((await GET(new Request('http://localhost/api/user/merchants'))).status, 401);
  signedIn = true;

  findManyResult = async () => {
    throw new Error('db down');
  };
  const failed = await GET(new Request('http://localhost/api/user/merchants'));
  assert.equal(failed.status, 500);

  process.stdout.write('user-merchants-route: ok\n');
}

void run();
