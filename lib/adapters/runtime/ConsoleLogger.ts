import type { Logger } from '../contracts/Logger.js';

export class ConsoleLogger implements Logger {
  info(message: string, meta?: unknown): void {
    console.warn(message, meta ?? null);
  }

  warn(message: string, meta?: unknown): void {
    console.warn(message, meta ?? null);
  }

  error(message: string, meta?: unknown): void {
    console.error(message, meta ?? null);
  }
}
