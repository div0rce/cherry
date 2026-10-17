import * as assert from 'node:assert/strict';
import * as Module from 'node:module';
import { fileURLToPath } from 'node:url';

// requireUserContext() sends signed-out visitors to /signin instead of throwing, and still throws
// for any other failure.

const __filename = fileURLToPath(import.meta.url);
const requireModule = Module.createRequire(__filename);

class RedirectError extends Error {
  url: string;

  constructor(url: string) {
    super(`Redirect to ${url}`);
    this.url = url;
  }
}

type FetchResult = { ok: true; data: unknown } | { ok: false; error: string; message: string };
let nextResult: FetchResult = { ok: true, data: null };

function stub(specifier: string, exports: Record<string, unknown>): void {
  const resolved = requireModule.resolve(specifier);
  requireModule.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports } as NodeModule;
}

stub('next/headers', {
  headers: async () => new Headers({ host: 'localhost:3000' }),
  cookies: async () => ({ toString: () => '' }),
});
stub('next/navigation', {
  redirect: (url: string) => {
    throw new RedirectError(url);
  },
});
stub('../../lib/api/fetch-json', { fetchApiResult: async () => nextResult });

const apiPath = requireModule.resolve('../../app/(user)/_lib/api.ts');
delete requireModule.cache[apiPath];
const { requireUserContext } = requireModule(apiPath) as {
  requireUserContext: () => Promise<{ userId: string; mode: string }>;
};

async function run(): Promise<void> {
  nextResult = { ok: true, data: { userId: 'user-1', mode: 'AUTHENTICATED' } };
  assert.deepEqual(await requireUserContext(), { userId: 'user-1', mode: 'AUTHENTICATED' });

  nextResult = { ok: false, error: 'UNAUTHORIZED', message: 'Unauthorized' };
  await assert.rejects(requireUserContext(), (error: unknown) => {
    assert.ok(error instanceof RedirectError, `expected a redirect, got ${String(error)}`);
    assert.equal(error.url, '/signin');
    return true;
  });

  nextResult = { ok: false, error: 'INTERNAL', message: 'boom' };
  await assert.rejects(requireUserContext(), (error: unknown) => {
    assert.equal(error instanceof RedirectError, false, 'non-auth failures must not redirect');
    return true;
  });

  process.stdout.write('require-user-context-redirect: ok\n');
}

void run();
