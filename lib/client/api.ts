'use client';

import { signIn } from 'next-auth/react';
import { z } from 'zod';
import { getPublicConfig } from '../config/store';
import { fetchJSON } from '../api/fetch-json';
import { asAppError } from '../errors';
import type { ApiResult } from '../api/result';

export type { ApiResult };

export async function callApi<TResponse>(
  input: RequestInfo | URL,
  init: RequestInit & { responseSchema?: z.ZodSchema<TResponse>; baseUrl?: string } = {}
): Promise<ApiResult<TResponse>> {
  const { responseSchema, baseUrl, ...rest } = init;
  const resolvedInput = resolveRequestInput(input, baseUrl);

  try {
    const parsed = await fetchJSON<unknown>(resolvedInput, {
      headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
      ...rest,
    });

    if (responseSchema !== undefined) {
      const check = responseSchema.safeParse(parsed);
      if (!check.success) {
        return { ok: false, error: 'INTERNAL', message: 'invalid_shape' };
      }
      return { ok: true, data: check.data };
    }

    return { ok: true, data: parsed as TResponse };
  } catch (err: unknown) {
    const error = asAppError(err);
    if (error.code === 'UNAUTHORIZED') {
      await signIn();
    }
    return { ok: false, error: error.code, message: error.message };
  }
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
  if (explicitBaseUrl !== undefined && explicitBaseUrl !== null && explicitBaseUrl !== '') {
    return explicitBaseUrl;
  }
  if (
    typeof window !== 'undefined' &&
    typeof window.location !== 'undefined' &&
    typeof window.location.origin === 'string' &&
    window.location.origin !== ''
  ) {
    return window.location.origin;
  }

  try {
    return getPublicConfig().appBaseUrl;
  } catch (error: unknown) {
    void error;
    // fall through
  }

  throw new Error('API base URL is not configured; pass baseUrl or initialize PublicConfig at the boundary.');
}

function isAbsoluteUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch (error: unknown) {
    void error;
    return false;
  }
}
