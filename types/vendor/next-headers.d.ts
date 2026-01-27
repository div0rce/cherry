/**
 * VENDOR SHIM
 * Reason: NodeNext/ESM requires explicit extensions; vendor .d.ts import paths violate NodeNext.
 * Scope: types/vendor/next-headers.d.ts
 * Version: next@16.0.8
 * Audit: 2026-01-27
 */

declare module 'next/headers' {
  export * from 'next/dist/server/request/cookies.js';
  export * from 'next/dist/server/request/headers.js';
  export * from 'next/dist/server/request/draft-mode.js';
}
