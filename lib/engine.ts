export * from './engine/index';
export {
  runEngine,
  evaluateTransaction,
  resolveCategory,
  type EngineDecision as LegacyEngineDecision,
  type EngineInput,
  type CategoryCoverageMode,
  type EvaluateTransactionResult,
} from './engine/legacy';
