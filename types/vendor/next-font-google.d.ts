/**
 * VENDOR SHIM
 * Reason: NodeNext/ESM requires explicit extensions; vendor .d.ts import paths violate NodeNext.
 * Scope: types/vendor/next-font-google.d.ts
 * Version: next@16.0.8
 * Audit: 2026-01-27
 */

declare module 'next/font/google' {
  export * from 'next/dist/compiled/@next/font/dist/google/index.js';
}
