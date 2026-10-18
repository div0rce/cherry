import * as assert from 'node:assert/strict';
import * as Module from 'node:module';
import { fileURLToPath } from 'node:url';

// withAuthErrors turns an UNAUTHORIZED AppError from resolveUserContext into 401 and rethrows
// anything else (cards and autopilot prereqs routes previously returned 500 when signed out).

const __filename = fileURLToPath(import.meta.url);
const requireModule = Module.createRequire(__filename);

function stub(specifier: string, exports: Record<string, unknown>): void {
  const resolved = requireModule.resolve(specifier);
  requireModule.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports } as NodeModule;
}
stub('../../lib/auth', { auth: async () => null });
stub('../../lib/user-context', { resolveUserContext: async () => ({ userId: 'user-1' }) });

const { AppError } = requireModule('../../lib/errors') as {
  AppError: new (code: string, message: string, status: number) => Error;
};
const { withAuthErrors } = requireModule('../../lib/with-user.ts') as {
  withAuthErrors: <A extends unknown[]>(h: (...a: A) => Promise<Response>) => (...a: A) => Promise<Response>;
};

async function run(): Promise<void> {
  const ok = withAuthErrors(async (n: number) => Response.json({ n }));
  assert.deepEqual(await (await ok(7)).json(), { n: 7 });

  const signedOut = withAuthErrors(async () => {
    throw new AppError('UNAUTHORIZED', 'Unauthorized: no active session', 401);
  });
  const res = await signedOut();
  assert.equal(res.status, 401);
  assert.deepEqual(await res.json(), { error: 'Unauthorized' });

  const boom = new Error('db down');
  const failing = withAuthErrors(async () => {
    throw boom;
  });
  await assert.rejects(failing(), (error: unknown) => error === boom);

  process.stdout.write('with-auth-errors: ok\n');
}

void run();
