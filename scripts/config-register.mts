import { createRequire } from 'node:module';
import { initConfigFromEnv } from '../lib/config/init.ts';
import { ensureTsEsm } from './lib/ensure-ts-esm.mts';

ensureTsEsm();

const requireFn = createRequire(import.meta.url);


declare global {
  var __CHERRY_TEST_MODE__: boolean | undefined;
}

globalThis.__CHERRY_TEST_MODE__ = true;
if (process.env['NEXT_PUBLIC_SITE_VERSION'] == null) {
  process.env['NEXT_PUBLIC_SITE_VERSION'] = 'test';
}
const { serverConfig } = initConfigFromEnv(process.env, {
  lockServerConfig: false,
  allowServerConfigOverwrite: true,
});
const store = requireFn('../lib/config/store') as typeof import('../lib/config/store.ts');
store.resetServerConfigForTests(serverConfig);
