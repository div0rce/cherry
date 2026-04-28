import { initConfigFromEnv } from './init.js';
import { getServerConfig } from './store.js';

export function ensureRouteConfigFromEnv(env: NodeJS.ProcessEnv): void {
  try {
    getServerConfig();
    return;
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message.includes('ServerConfig not initialized')
    ) {
      initConfigFromEnv(env);
      return;
    }
    throw error;
  }
}
