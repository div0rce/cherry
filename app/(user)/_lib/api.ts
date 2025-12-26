'use server';

import { cookies, headers } from 'next/headers';

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

export async function fetchFromApi(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const base = await getApiBaseUrl();
  const url = base.length > 0 ? `${base}${path}` : path;
  const nextHeaders = new Headers(init.headers);
  const cookieJar = await cookies();
  const cookieHeader = cookieJar.toString();
  if (cookieHeader.length > 0) {
    nextHeaders.set('cookie', cookieHeader);
  }

  return fetch(url, {
    ...init,
    cache: 'no-store',
    headers: nextHeaders,
  });
}

export async function requireUserContext(): Promise<UserContextResponse> {
  const response = await fetchFromApi('/api/user/context');
  if (!response.ok) {
    throw new Error('Unauthorized');
  }
  return response.json() as Promise<UserContextResponse>;
}
