import { buildPublicConfig, buildRuntimeConfig, buildServerConfig } from './from-env.ts';
import { setPublicConfig, setRuntimeConfig, setServerConfig, lockServerConfig } from './store.ts';
import type { PublicConfig } from './public.ts';
import type { RuntimeConfig } from './runtime.ts';
import type { ServerConfig } from './server.ts';

type InitOptions = {
  lockServerConfig?: boolean;
  allowServerConfigOverwrite?: boolean;
};

let configInitialized = false;

function resolveLockingOptions(env: NodeJS.ProcessEnv, options?: InitOptions): Required<InitOptions> {
  const normalizedEnv = (env['NODE_ENV'] ?? 'development').toLowerCase();
  const isTest = normalizedEnv === 'test';
  return {
    lockServerConfig: options?.lockServerConfig ?? !isTest,
    allowServerConfigOverwrite: options?.allowServerConfigOverwrite ?? isTest,
  };
}

export function initConfigFromEnv(env: NodeJS.ProcessEnv, options?: InitOptions): {
  serverConfig: ServerConfig;
  publicConfig: PublicConfig;
  runtimeConfig: RuntimeConfig;
} {
  if (configInitialized) {
    throw new Error(
      'Config already initialized. initConfigFromEnv must be called exactly once per process.'
    );
  }
  configInitialized = true;

  const locking = resolveLockingOptions(env, options);
  const serverConfig = setServerConfig(buildServerConfig(env), {
    lock: false,
    allowOverwrite: locking.allowServerConfigOverwrite,
  });
  if (locking.lockServerConfig) {
    lockServerConfig();
  }
  const publicConfig = setPublicConfig(buildPublicConfig(env));
  const runtimeConfig = setRuntimeConfig(buildRuntimeConfig(env));
  return { serverConfig, publicConfig, runtimeConfig };
}
