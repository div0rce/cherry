import type { Logger } from '../adapters/contracts/Logger';

export type EngineRuntime = {
  enableLogs: boolean;
  logger?: Logger;
};

export const DEFAULT_ENGINE_RUNTIME: EngineRuntime = {
  enableLogs: true,
};
