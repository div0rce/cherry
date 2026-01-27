/**
 * VENDOR SHIM
 * Reason: NodeNext/ESM requires explicit extensions; vendor .d.ts import paths violate NodeNext.
 * Scope: types/vendor/next-navigation.d.ts
 * Version: next@16.0.8
 * Audit: 2026-01-27
 */

declare module 'next/navigation' {
  export * from 'next/dist/client/components/navigation.js';
}
