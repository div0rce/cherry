'use client';

import { signIn } from 'next-auth/react';
import { z } from 'zod';

export type ApiResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error: string };

export async function callApi<TResponse>(
  input: RequestInfo,
  init: RequestInit & { responseSchema?: z.ZodSchema<TResponse> } = {}
): Promise<ApiResult<TResponse>> {
  const { responseSchema, ...rest } = init;

  const res = await fetch(input, {
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
