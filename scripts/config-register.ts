import { initConfigFromEnv } from '@/lib/config/init';

declare global {
  var __CHERRY_TEST_MODE__: boolean | undefined;
}

globalThis.__CHERRY_TEST_MODE__ = true;
initConfigFromEnv(process.env, { lockServerConfig: false, allowServerConfigOverwrite: true });
