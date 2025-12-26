import { createRequire } from 'node:module';

const requireFn = createRequire(import.meta.url);
requireFn('ts-node/register/transpile-only');

const { initConfigFromEnv } = requireFn('../lib/config/init.ts') as typeof import('../lib/config/init.ts');

declare global {
  var __CHERRY_TEST_MODE__: boolean | undefined;
}

globalThis.__CHERRY_TEST_MODE__ = true;
if (process.env['NEXT_PUBLIC_SITE_VERSION'] == null) {
  process.env['NEXT_PUBLIC_SITE_VERSION'] = 'test';
}
initConfigFromEnv(process.env, { lockServerConfig: false, allowServerConfigOverwrite: true });
