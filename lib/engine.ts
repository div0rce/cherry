export * from './engine/index.js';
export {
  runEngine,
  evaluateTransaction,
  resolveCategory,
  type EngineDecision as LegacyEngineDecision,
  type LegacyEngineInput,
  type CategoryCoverageMode,
  type EvaluateTransactionResult,
} from './engine/legacy.js';
