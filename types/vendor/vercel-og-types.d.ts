/**
 * VENDOR SHIM
 * Reason: NodeNext/ESM requires explicit extensions; vendor .d.ts import paths violate NodeNext.
 * Scope: types/vendor/vercel-og-types.d.ts
 * Version: next@16.0.8
 * Audit: 2026-01-27
 */

declare module 'next/dist/compiled/@vercel/og/types' {
  export type ImageResponseOptions = Record<string, unknown>;
}
