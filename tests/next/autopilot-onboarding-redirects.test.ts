import * as assert from 'node:assert/strict';
import * as Module from 'node:module';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const requireModule = Module.createRequire(__filename);

class RedirectError extends Error {
  url: string;

  constructor(url: string) {
    super(`Redirect to ${url}`);
    this.url = url;
  }
}

type PrereqCounts = {
  cardsCount: number;
  rulesCount: number;
  bucketsCount: number;
};

const mockPrereqs: PrereqCounts = {
  cardsCount: 1,
  rulesCount: 1,
  bucketsCount: 1,
};

function installMocks(): void {
  const userContextPath = requireModule.resolve('../../lib/user-context');
  const apiPath = requireModule.resolve('../../app/(user)/_lib/api.ts');
  const navigationPath = requireModule.resolve('next/navigation');

  delete requireModule.cache[userContextPath];
  delete requireModule.cache[apiPath];
  delete requireModule.cache[navigationPath];

  requireModule.cache[userContextPath] = {
    id: userContextPath,
    filename: userContextPath,
    loaded: true,
    exports: {
      resolveUserContext: async () => ({ userId: 'user-1', mode: 'AUTHENTICATED', email: null }),
    },
  } as NodeModule;

  requireModule.cache[apiPath] = {
    id: apiPath,
    filename: apiPath,
    loaded: true,
    exports: {
      requireUserContext: async () => ({ userId: 'user-1', mode: 'AUTHENTICATED' }),
      fetchFromApi: async (path: string) => {
        if (path !== '/api/autopilot/prereqs') {
          throw new Error(`Unexpected fetchFromApi call: ${path}`);
        }
        const missing =
          mockPrereqs.cardsCount <= 0
            ? 'cards'
            : mockPrereqs.rulesCount <= 0
              ? 'rules'
              : mockPrereqs.bucketsCount <= 0
                ? 'buckets'
                : null;
        return {
          ok: true,
          data: {
            prereqs: {
              ...mockPrereqs,
              cards: [],
              buckets: [],
              hasBaseRule: true,
              state: 'READY',
              warnings: [],
            },
            missing,
          },
        };
      },
    },
  } as NodeModule;

  requireModule.cache[navigationPath] = {
    id: navigationPath,
    filename: navigationPath,
    loaded: true,
    exports: {
      redirect: (url: string) => {
        throw new RedirectError(url);
      },
    },
  } as NodeModule;
}

async function loadAutopilotPage(): Promise<() => Promise<unknown>> {
  const pagePath = requireModule.resolve('../../app/(user)/app/autopilot/page.tsx');
  delete requireModule.cache[pagePath];
  installMocks();
  const modUnknown: unknown = requireModule(pagePath);
  const defaultExport =
    typeof (modUnknown as { default?: unknown })?.default === 'function'
      ? (modUnknown as { default: () => Promise<unknown> }).default
      : null;
  if (defaultExport === null) {
    throw new Error('Autopilot page default export not found');
  }
  return defaultExport;
}

async function assertRedirect(expected: 'cards' | 'rules' | 'buckets'): Promise<void> {
  mockPrereqs.cardsCount = expected === 'cards' ? 0 : 1;
  mockPrereqs.rulesCount = expected === 'rules' ? 0 : 1;
  mockPrereqs.bucketsCount = expected === 'buckets' ? 0 : 1;

  const AutopilotPage = await loadAutopilotPage();
  let threw = false;
  try {
    await AutopilotPage();
  } catch (err) {
    threw = true;
    assert.ok(err instanceof RedirectError);
    assert.equal((err as RedirectError).url, `/app/onboarding?missing=${expected}`);
  }
  assert.equal(threw, true, `Expected redirect for missing=${expected}`);
}

async function assertNoRedirect(): Promise<void> {
  mockPrereqs.cardsCount = 1;
  mockPrereqs.rulesCount = 1;
  mockPrereqs.bucketsCount = 1;

  const AutopilotPage = await loadAutopilotPage();
  try {
    const result = await AutopilotPage();
    assert.notEqual(result, null);
  } catch (err) {
    assert.ok(!(err instanceof RedirectError), 'Expected no redirect when prereqs are satisfied');
  }
}

async function run(): Promise<void> {
  await assertRedirect('cards');
  await assertRedirect('rules');
  await assertRedirect('buckets');
  await assertNoRedirect();
  console.warn('autopilot-onboarding-redirects: ok');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
