/**
 * VENDOR SHIM
 * Reason: NodeNext/ESM requires explicit extensions; vendor .d.ts import paths violate NodeNext.
 * Scope: types/vendor/next-link.d.ts
 * Version: next@16.0.8
 * Audit: 2026-01-27
 */

declare module 'next/link' {
  export * from 'next/dist/client/link.js';
  const Link: typeof import('next/dist/client/link.js').default;
  export default Link;
}
