import { createRequire } from 'node:module';
import { initConfigFromEnv } from '../../lib/config/init.js';
import type { ServerConfig } from '../../lib/config/server.js';
import { ensureTsEsm } from './ensure-ts-esm.mjs';

ensureTsEsm();

const requireFn = createRequire(import.meta.url);


declare global {
  var __CHERRY_TEST_MODE__: boolean | undefined;
}

globalThis.__CHERRY_TEST_MODE__ = true;
if (process.env['NEXT_PUBLIC_SITE_VERSION'] == null) {
  process.env['NEXT_PUBLIC_SITE_VERSION'] = 'test';
}
const initResult = initConfigFromEnv(process.env, {
  lockServerConfig: false,
  allowServerConfigOverwrite: true,
}) as { serverConfig: ServerConfig };
const { serverConfig } = initResult;
const store = requireFn('../../lib/config/store') as typeof import('../../lib/config/store.js');
store.resetServerConfigForTests(serverConfig);
