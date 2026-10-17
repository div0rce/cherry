import type { PublicConfig } from './public.js';
import type { RuntimeConfig } from './runtime.js';
import type { ServerConfig } from './server.js';

// One store per process, not per module copy. Next compiles this module into every bundle layer
// (route handlers, server components, instrumentation.ts) as separate copies, so module-level
// variables set in one copy were invisible to the others and every getServerConfig() in a
// production server threw "not initialized". Same process-wide pattern as lib/prisma.ts.
type ConfigState = {
  server: ServerConfig | null;
  public: PublicConfig | null;
  runtime: RuntimeConfig | null;
  serverLocked: boolean;
};
const globalForConfig = globalThis as unknown as { __cherryConfigState?: ConfigState };
if (globalForConfig.__cherryConfigState === undefined) {
  globalForConfig.__cherryConfigState = { server: null, public: null, runtime: null, serverLocked: false };
}
const state: ConfigState = globalForConfig.__cherryConfigState;

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
  if (state.serverLocked) return;
  if (state.server === null) {
    throw new Error('Cannot lock server config before it is set.');
  }
  state.serverLocked = true;
}

export function setServerConfig(
  config: ServerConfig,
  options?: { lock?: boolean; allowOverwrite?: boolean }
): ServerConfig {
  if (state.serverLocked) {
    throw new Error('Server config is locked. Config must be set before execution.');
  }

  if (state.server !== null && options?.allowOverwrite !== true) {
    throw new Error('Server config already set.');
  }

  state.server = deepFreeze({ ...config });
  if (options?.lock ?? true) {
    lockServerConfig();
  }
  return state.server;
}

export function getServerConfig(): ServerConfig {
  if (state.server === null) {
    throw new Error(
      'ServerConfig not initialized. Call initConfigFromEnv() in app/api/** routes, scripts, or test bootstrap before reading config.'
    );
  }

  return state.server;
}

export function hasServerConfig(): boolean {
  return state.server !== null;
}

export function setPublicConfig(config: PublicConfig): PublicConfig {
  state.public = deepFreeze({ ...config });
  return state.public;
}

export function getPublicConfig(): PublicConfig {
  if (state.public === null) {
    throw new Error('PublicConfig not initialized; load config at the boundary first');
  }
  return state.public;
}

export function setRuntimeConfig(config: RuntimeConfig): RuntimeConfig {
  state.runtime = deepFreeze({ ...config });
  return state.runtime;
}

export function getRuntimeConfig(): RuntimeConfig {
  if (state.runtime === null) {
    throw new Error('RuntimeConfig not initialized; load config at the boundary first');
  }
  return state.runtime;
}

export function isServerConfigLocked(): boolean {
  return state.serverLocked;
}

export function resetServerConfigForTests(config: ServerConfig): void {
  const isTestRuntime =
    typeof globalThis === 'object' &&
    globalThis !== null &&
    (globalThis as { __CHERRY_TEST_MODE__?: boolean }).__CHERRY_TEST_MODE__ === true;
  if (!isTestRuntime) {
    throw new Error('resetServerConfigForTests may only be called from the test harness');
  }
  state.serverLocked = false;
  state.server = deepFreeze({ ...config });
}
