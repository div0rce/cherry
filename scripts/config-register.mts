import { initConfigFromEnv } from '../lib/config/init.ts';
import { ensureTsEsm } from './lib/ensure-ts-esm.ts';

ensureTsEsm();


declare global {
  var __CHERRY_TEST_MODE__: boolean | undefined;
}

globalThis.__CHERRY_TEST_MODE__ = true;
if (process.env['NEXT_PUBLIC_SITE_VERSION'] == null) {
  process.env['NEXT_PUBLIC_SITE_VERSION'] = 'test';
}
initConfigFromEnv(process.env, { lockServerConfig: false, allowServerConfigOverwrite: true });
