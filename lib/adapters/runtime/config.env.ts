import { getServerConfig } from '../../config/store';
import type { ConfigReader } from '../config';

export const ServerConfigReader: ConfigReader = {
  get: (key) => {
    const config = getServerConfig();
    const value = (config as Record<string, unknown>)[key];
    return typeof value === 'string' ? value : undefined;
  },
};
