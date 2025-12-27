import { AppError, asAppError, type AppErrorCode } from '../errors';
import type { ApiResult } from './result';

// Transport boundary helpers: fetchJSON throws AppError, fetchApiResult returns ApiResult for UI use.
const APP_ERROR_CODES: AppErrorCode[] = [
  'UNAUTHORIZED',
  'NOT_FOUND',
  'VALIDATION',
  'INTERNAL',
  'CONFLICT',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isAppErrorCode(value: unknown): value is AppErrorCode {
  return typeof value === 'string' && APP_ERROR_CODES.includes(value as AppErrorCode);
}

function codeForStatus(status: number): AppErrorCode {
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 404) return 'NOT_FOUND';
  if (status === 409) return 'CONFLICT';
  if (status === 400 || status === 422) return 'VALIDATION';
  return 'INTERNAL';
}

async function safeReadJson(res: Response): Promise<unknown | null> {
  try {
    return await res.json();
  } catch (error: unknown) {
    void error;
    return null;
  }
}

function extractErrorPayload(
  payload: unknown,
  fallbackCode: AppErrorCode,
  fallbackMessage: string
): { code: AppErrorCode; message: string } {
  if (isRecord(payload)) {
    const maybeError = payload['error'];
    const maybeMessage = payload['message'];
    const code = isAppErrorCode(maybeError) ? maybeError : fallbackCode;
    const message =
      typeof maybeMessage === 'string' && maybeMessage.trim().length > 0
        ? maybeMessage
        : typeof maybeError === 'string' && maybeError.trim().length > 0
          ? maybeError
          : fallbackMessage;
    return { code, message };
  }

  return { code: fallbackCode, message: fallbackMessage };
}

export type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function resolveFetcher(fetcher?: Fetcher): Fetcher {
  if (fetcher !== undefined) return fetcher;
  if (typeof globalThis.fetch === 'function') {
    return globalThis.fetch.bind(globalThis);
  }
  throw new AppError('INTERNAL', 'Fetch is not available in this environment', 500);
}

export async function fetchJSON<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
  fetcher?: Fetcher
): Promise<T> {
  const performFetch = resolveFetcher(fetcher);
  let response: Response;
  try {
    response = await performFetch(input, init);
  } catch (err: unknown) {
    throw asAppError(err);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = await safeReadJson(response);

  if (!response.ok) {
    const fallbackMessage =
      typeof response.statusText === 'string' && response.statusText.trim().length > 0
        ? response.statusText
        : 'Request failed';
    const fallbackCode = codeForStatus(response.status);
    const { code, message } = extractErrorPayload(payload, fallbackCode, fallbackMessage);
    throw new AppError(code, message, response.status, payload ?? undefined);
  }

  if (payload === null) {
    throw new AppError('INTERNAL', 'Invalid JSON response', 500);
  }

  return payload as T;
}

export async function fetchApiResult<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
  fetcher?: Fetcher
): Promise<ApiResult<T>> {
  try {
    const data = await fetchJSON<T>(input, init, fetcher);
    return { ok: true, data };
  } catch (err: unknown) {
    const error = asAppError(err);
    return { ok: false, error: error.code, message: error.message };
  }
}
