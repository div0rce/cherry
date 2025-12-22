'use client';

import { signIn } from 'next-auth/react';
import { z } from 'zod';

export type ApiResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error: string };

export async function callApi<TResponse>(
  input: RequestInfo | URL,
  init: RequestInit & { responseSchema?: z.ZodSchema<TResponse>; baseUrl?: string } = {}
): Promise<ApiResult<TResponse>> {
  const { responseSchema, baseUrl, ...rest } = init;
  const resolvedInput = resolveRequestInput(input, baseUrl);

  const res = await fetch(resolvedInput, {
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
    ...rest,
  });

  if (res.status === 401) {
    await signIn();
    return { ok: false, status: 401, error: 'unauthorized' };
  }

  if (!res.ok) {
    let msg = `request_failed_${res.status}`;
    try {
      const body: unknown = await res.json();
      if (body !== null && typeof body === 'object') {
        const maybeError = (body as Record<string, unknown>)['error'];
        const maybeMessage = (body as Record<string, unknown>)['message'];
        if (typeof maybeError === 'string') msg = maybeError;
        if (typeof maybeMessage === 'string') msg = maybeMessage;
      }
    } catch {
      // ignore parse issues
    }
    return { ok: false, status: res.status, error: msg };
  }

  let parsed: unknown;
  try {
    parsed = await res.json();
  } catch {
    return { ok: false, status: res.status, error: 'invalid_json' };
  }

  if (responseSchema) {
    const check = responseSchema.safeParse(parsed);
    if (!check.success) {
      return { ok: false, status: res.status, error: 'invalid_shape' };
    }
    return { ok: true, status: res.status, data: check.data };
  }

  return { ok: true, status: res.status, data: parsed as TResponse };
}

function resolveRequestInput(input: RequestInfo | URL, baseUrl?: string): RequestInfo {
  if (typeof input === 'string') {
    if (isAbsoluteUrl(input)) return input;
    return new URL(input, resolveBaseUrl(baseUrl)).toString();
  }

  if (input instanceof URL) {
    return input.toString();
  }

  if (typeof Request !== 'undefined' && input instanceof Request) {
    if (isAbsoluteUrl(input.url)) return input;
    return new Request(new URL(input.url, resolveBaseUrl(baseUrl)), input);
  }

  return input;
}

function resolveBaseUrl(explicitBaseUrl?: string): string {
  if (explicitBaseUrl) return explicitBaseUrl;
  if (typeof window !== 'undefined' && window?.location?.origin) {
    return window.location.origin;
  }
  if (typeof process !== 'undefined' && process?.env?.API_BASE_URL) {
    return process.env.API_BASE_URL;
  }
  throw new Error('API base URL is not configured; set API_BASE_URL or pass baseUrl to callApi.');
}

function isAbsoluteUrl(value: string): boolean {
  try {
    // eslint-disable-next-line no-new
    new URL(value);
    return true;
  } catch {
    return false;
  }
}
