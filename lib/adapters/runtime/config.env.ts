import { getServerConfig } from '../../config/store.js';
import type { ConfigReader } from '../config.js';

export const ServerConfigReader: ConfigReader = {
  get: (key) => {
    const config = getServerConfig();
    const value = (config as Record<string, unknown>)[key];
    return typeof value === 'string' ? value : undefined;
  },
};
