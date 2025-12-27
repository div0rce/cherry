import type { Logger } from '../logger';

export const ConsoleLogger: Logger = {
  info: (message, meta) => {
    if (meta === undefined) {
      console.info(message);
    } else {
      console.info(message, meta);
    }
  },
  warn: (message, meta) => {
    if (meta === undefined) {
      console.warn(message);
    } else {
      console.warn(message, meta);
    }
  },
  error: (message, meta) => {
    if (meta === undefined) {
      console.error(message);
    } else {
      console.error(message, meta);
    }
  },
};
