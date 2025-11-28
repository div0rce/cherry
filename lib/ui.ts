/**
 * EMPTY_STATE_CARD_CLASSES
 *
 * Shared visual language for "no data" / empty states in Cherry:
 * - Dark glass: bg-slate-950/40 with backdrop-blur.
 * - Muted dashed border: border-white/10, rounded-xl.
 * - Small, muted text: text-sm text-slate-400.
 * - No heavy decoration, no bright CTA by default.
 *
 * Use this on cards, panels, and inline blocks that present empty-state messaging.
 * For <ul> lists, prefer wrapping it via <EmptyList />.
 */
export const EMPTY_STATE_CARD_CLASSES =
  'rounded-xl border border-dashed border-white/10 bg-slate-950/40 px-4 py-5 text-sm text-slate-400 backdrop-blur shadow-sm';
