import type { Logger } from '../adapters/contracts/Logger.js';

export type EngineRuntime = {
  enableLogs: boolean;
  logger?: Logger;
};

export const DEFAULT_ENGINE_RUNTIME: EngineRuntime = {
  enableLogs: true,
};
