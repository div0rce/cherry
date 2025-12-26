require('ts-node/register/transpile-only');
require('tsconfig-paths/register');

globalThis.__CHERRY_TEST_MODE__ = true;
if (process.env.NEXT_PUBLIC_SITE_VERSION == null) {
  process.env.NEXT_PUBLIC_SITE_VERSION = 'test';
}

const { initConfigFromEnv } = require('../lib/config/init.ts');
initConfigFromEnv(process.env, { lockServerConfig: false, allowServerConfigOverwrite: true });
