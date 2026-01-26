'use server';

import { cookies, headers } from 'next/headers';
import { fetchApiResult } from '../../../lib/api/fetch-json.js';
import type { ApiResult } from '../../../lib/api/result';
import { AppError } from '../../../lib/errors.js';

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

/*
TODO(cherry): auth-bound user bootstrap; remove user seeding
COMMENT ONLY — DO NOT IMPLEMENT HERE.

Problem:
- Frontend currently errors with UNAUTHORIZED because an authenticated session can exist without
  a corresponding initialized domain identity (user + ledger + baseline state).
- User seeding is stale/fragile and will keep drifting as schema + invariants evolve.

Non-negotiables:
1) No pre-seeded users. Ever.
2) Users are created only as a consequence of successful auth (NextAuth callback / auth boundary).
3) First-login initialization is a deterministic constructor (versioned + idempotent), not a seed.

Required future work (not in this file):
A) Delete user-related seed logic:
   - remove seeded “dev/default” users, hardcoded IDs/emails, seeded ledgers/accounts.
   - keep only static reference data in seeds.

B) Move identity creation to auth boundary:
   - on auth success: upsert user keyed by (provider, providerAccountId).
   - must be idempotent; no blind inserts.

C) Make /api/user/context explicit:
   - UNAUTHORIZED only for unauthenticated requests.
   - if authenticated but not initialized: return code USER_NOT_INITIALIZED (not 401).

D) Add one-time initializer (constructor):
   - on first login: create ledger(s), baseline accounts/buckets, initial accounting snapshot.
   - deterministic, versioned, replayable, testable.

Rationale:
- Seeded identities drift; constructors don’t.
- This preserves invariants and stabilizes dev/prod boot.
*/
export async function requireUserContext(): Promise<UserContextResponse> {
  const result = await fetchFromApi<UserContextResponse>('/api/user/context');
  if (!result.ok) {
    throw new AppError('UNAUTHORIZED', 'Unauthorized', 401);
  }
  return result.data;
}
