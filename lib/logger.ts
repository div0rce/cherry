/* eslint-disable no-console */

export type LogContext = Array<unknown>;

export function logInfo(message: string, ...context: LogContext): void {
  console.info(`[INFO] ${message}`, ...context);
}

export function logWarn(message: string, ...context: LogContext): void {
  console.warn(`[WARN] ${message}`, ...context);
}

export function logError(message: string, ...context: LogContext): void {
  console.error(`[ERROR] ${message}`, ...context);
}
