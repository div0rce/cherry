/* eslint-disable no-console */

export type LogContext = Array<unknown>;

export function logInfo(message: string, ...context: LogContext) {
  console.info(`[INFO] ${message}`, ...context);
}

export function logWarn(message: string, ...context: LogContext) {
  console.warn(`[WARN] ${message}`, ...context);
}

export function logError(message: string, ...context: LogContext) {
  console.error(`[ERROR] ${message}`, ...context);
}
