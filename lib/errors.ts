export type AppErrorCode =
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'INTERNAL'
  | 'CONFLICT';

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: AppErrorCode, message: string, status: number, details?: unknown) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function asAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  if (err instanceof Error) return new AppError('INTERNAL', err.message, 500, err);
  return new AppError('INTERNAL', String(err), 500, err);
}

export function isUnauthorized(err: AppError): boolean {
  return err.code === 'UNAUTHORIZED' || err.status === 401;
}

export function asLogMeta(value: unknown): string | null {
  return value == null ? null : String(value);
}
