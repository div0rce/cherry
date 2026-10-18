import type { EngineContext, EngineSurface } from './types.js';

// Bump when core decision behavior or payload shapes materially change.
export const ENGINE_VERSION = 'v0.2.0';

function nullIfMissing<T>(value: T | null | undefined): T | null {
  return value == null ? null : value;
}

function assertNowMs(nowMs: number): void {
  if (nowMs == null || Number.isNaN(nowMs)) {
    throw new Error('EngineContext requires explicit `nowMs`');
  }
}

export function fromExternalContextToEngineContext(input: {
  surface?: EngineSurface;
  nowMs: number;
  merchantName?: string | null;
  merchantDomain?: string | null;
  merchantCategoryKey?: string | null;
  mcc?: string | null;
  amountCents?: number | null;
  locationCity?: string | null;
  locationCountry?: string | null;
}): EngineContext {
  assertNowMs(input.nowMs);

  return {
    surface: input.surface == null ? 'unknown' : input.surface,
    nowMs: input.nowMs,
    merchantName: nullIfMissing(input.merchantName),
    merchantDomain: nullIfMissing(input.merchantDomain),
    merchantCategoryKey: nullIfMissing(input.merchantCategoryKey),
    mcc: nullIfMissing(input.mcc),
    amountCents: nullIfMissing(input.amountCents),
    locationCity: nullIfMissing(input.locationCity),
    locationCountry: nullIfMissing(input.locationCountry),
    payPeriodDayOfCycle: null,
  };
}

// Legacy alias preserved for existing callers.
export const buildEngineContext = fromExternalContextToEngineContext;
