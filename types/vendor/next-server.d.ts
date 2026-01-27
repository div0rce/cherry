/**
 * VENDOR SHIM
 * Reason: NodeNext/ESM requires explicit extensions; vendor .d.ts import paths violate NodeNext.
 * Scope: types/vendor/next-server.d.ts
 * Version: next@16.0.8
 * Audit: 2026-01-27
 */

import type { AsyncLocalStorage as NodeAsyncLocalStorage } from 'async_hooks';

declare global {
  var AsyncLocalStorage: typeof NodeAsyncLocalStorage;
}

declare module 'next/server' {

  export { NextFetchEvent } from 'next/dist/server/web/spec-extension/fetch-event.js';
  export { NextRequest } from 'next/dist/server/web/spec-extension/request.js';
  export { NextResponse } from 'next/dist/server/web/spec-extension/response.js';
  export {
    NextMiddleware,
    MiddlewareConfig,
    NextProxy,
    ProxyConfig,
  } from 'next/dist/server/web/types.js';
  export { userAgentFromString } from 'next/dist/server/web/spec-extension/user-agent.js';
  export { userAgent } from 'next/dist/server/web/spec-extension/user-agent.js';
  export { URLPattern } from 'next/dist/compiled/@edge-runtime/primitives/url.js';
  export type ImageResponseOptions = Record<string, unknown>;
  export class ImageResponse extends Response {
    constructor(body: BodyInit | null, options?: ImageResponseOptions);
  }
  export { after } from 'next/dist/server/after.js';
  export { connection } from 'next/dist/server/request/connection.js';
}
