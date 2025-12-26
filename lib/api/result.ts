import type { AppErrorCode } from '../errors.js';

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: AppErrorCode; message: string };
