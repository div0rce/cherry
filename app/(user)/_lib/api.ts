'use server';

import { cookies, headers } from 'next/headers';
import { fetchApiResult } from '../../../lib/api/fetch-json';
import type { ApiResult } from '../../../lib/api/result';
import { AppError } from '../../../lib/errors';

type UserContextResponse = {
  userId: string;
  mode: string;
};

async function getApiBaseUrl(): Promise<string> {
  const headerStore = await headers();
  const host = headerStore.get('host');
  if (host === null) return '';
  const trimmedHost = host.trim();
  if (trimmedHost.length === 0) return '';
  const isLocal = trimmedHost.startsWith('localhost') || trimmedHost.startsWith('127.');
  const protocol = isLocal ? 'http' : 'https';
  return `${protocol}://${trimmedHost}`;
}

export async function fetchFromApi<T>(
  path: string,
  init: RequestInit = {}
): Promise<ApiResult<T>> {
  const base = await getApiBaseUrl();
  const url = base.length > 0 ? `${base}${path}` : path;
  const nextHeaders = new Headers(init.headers);
  const cookieJar = await cookies();
  const cookieHeader = cookieJar.toString();
  if (cookieHeader.length > 0) {
    nextHeaders.set('cookie', cookieHeader);
  }

  return fetchApiResult<T>(url, {
    ...init,
    cache: 'no-store',
    headers: nextHeaders,
  });
}

export async function requireUserContext(): Promise<UserContextResponse> {
  const result = await fetchFromApi<UserContextResponse>('/api/user/context');
  if (!result.ok) {
    throw new AppError('UNAUTHORIZED', 'Unauthorized', 401);
  }
  return result.data;
}
