export * from './engine/index.js';
// Types only: the legacy engine's runtime (runEngine, evaluateTransaction, resolveCategory) lives in
// lib/legacy-engine.ts and is Prisma-backed, so it is imported from there, never through this barrel.
export type {
  EngineDecision as LegacyEngineDecision,
  LegacyEngineInput,
  CategoryCoverageMode,
  EvaluateTransactionResult,
} from './legacy-engine.js';
