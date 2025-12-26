import type { PublicConfig } from './public.js';
import type { RuntimeConfig } from './runtime.js';
import type { ServerConfig } from './server.js';

let serverConfig: ServerConfig | null = null;
let publicConfig: PublicConfig | null = null;
let runtimeConfig: RuntimeConfig | null = null;
let serverConfigLocked = false;

function deepFreeze<T>(obj: T): T {
  Object.freeze(obj);
  for (const key of Object.getOwnPropertyNames(obj)) {
    const value = (obj as Record<string, unknown>)[key];
    if (
      value !== undefined &&
      value !== null &&
      typeof value === 'object' &&
      !Object.isFrozen(value)
    ) {
      deepFreeze(value);
    }
  }
  return obj;
}

export function lockServerConfig(): void {
  if (serverConfigLocked) return;
  if (serverConfig === null) {
    throw new Error('Cannot lock server config before it is set.');
  }
  serverConfigLocked = true;
}

export function setServerConfig(
  config: ServerConfig,
  options?: { lock?: boolean; allowOverwrite?: boolean }
): ServerConfig {
  if (serverConfigLocked) {
    throw new Error('Server config is locked. Config must be set before execution.');
  }

  if (serverConfig !== null && options?.allowOverwrite !== true) {
    throw new Error('Server config already set.');
  }

  serverConfig = deepFreeze({ ...config });
  if (options?.lock ?? true) {
    lockServerConfig();
  }
  return serverConfig;
}

export function getServerConfig(): ServerConfig {
  if (serverConfig === null) {
    throw new Error(
      'ServerConfig not initialized. Call initConfigFromEnv() in app/api/** routes, scripts, or test bootstrap before reading config.'
    );
  }

  return serverConfig;
}

export function setPublicConfig(config: PublicConfig): PublicConfig {
  publicConfig = deepFreeze({ ...config });
  return publicConfig;
}

export function getPublicConfig(): PublicConfig {
  if (publicConfig === null) {
    throw new Error('PublicConfig not initialized; load config at the boundary first');
  }
  return publicConfig;
}

export function setRuntimeConfig(config: RuntimeConfig): RuntimeConfig {
  runtimeConfig = deepFreeze({ ...config });
  return runtimeConfig;
}

export function getRuntimeConfig(): RuntimeConfig {
  if (runtimeConfig === null) {
    throw new Error('RuntimeConfig not initialized; load config at the boundary first');
  }
  return runtimeConfig;
}

export function isServerConfigLocked(): boolean {
  return serverConfigLocked;
}

export function resetServerConfigForTests(config: ServerConfig): void {
  const isTestRuntime =
    typeof globalThis === 'object' &&
    globalThis !== null &&
    (globalThis as { __CHERRY_TEST_MODE__?: boolean }).__CHERRY_TEST_MODE__ === true;
  if (!isTestRuntime) {
    throw new Error('resetServerConfigForTests may only be called from the test harness');
  }
  serverConfigLocked = false;
  serverConfig = deepFreeze({ ...config });
}
