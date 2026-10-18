'use client';

import { signIn } from 'next-auth/react';
import { z } from 'zod';
import { getPublicConfig } from '../config/store.js';
import { fetchJSON } from '../api/fetch-json.js';
import { asAppError } from '../errors.js';
import type { ApiResult } from '../api/result.js';

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
  if (typeof input === 'string') return resolveStringInput(input, baseUrl);
  if (input instanceof URL) return input.toString();
  if (isRequest(input)) return resolveRequestObject(input, baseUrl);
  return input;
}

function resolveStringInput(input: string, baseUrl?: string): string {
  if (isAbsoluteUrl(input)) return input;
  return new URL(input, resolveBaseUrl(baseUrl)).toString();
}

function isRequest(input: RequestInfo): input is Request {
  return typeof Request !== 'undefined' && input instanceof Request;
}

function resolveRequestObject(input: Request, baseUrl?: string): Request {
  if (isAbsoluteUrl(input.url)) return input;
  return new Request(new URL(input.url, resolveBaseUrl(baseUrl)), input);
}

function hasValue(value?: string | null): value is string {
  return value !== undefined && value !== null && value !== '';
}

function windowOrigin(): string | undefined {
  if (typeof window === 'undefined' || typeof window.location === 'undefined') return undefined;
  const origin: unknown = window.location.origin;
  return typeof origin === 'string' && origin !== '' ? origin : undefined;
}

function configuredBaseUrl(): string | undefined {
  try {
    return getPublicConfig().appBaseUrl;
  } catch (error: unknown) {
    void error;
    return undefined;
  }
}

function resolveBaseUrl(explicitBaseUrl?: string): string {
  if (hasValue(explicitBaseUrl)) return explicitBaseUrl;
  const resolved = windowOrigin() ?? configuredBaseUrl();
  if (resolved !== undefined) return resolved;
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
