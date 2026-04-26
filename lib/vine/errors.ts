import type { EngineDegradation } from '../engine/degradation.js';

export type VineDecisionErrorCode =
  | 'ENGINE_FAILURE'
  | 'NO_TRUTHFUL_DECISION'
  | 'DECISION_MAPPING_FAILED';

export class VineDecisionError extends Error {
  readonly code: VineDecisionErrorCode;
  readonly degradation: EngineDegradation;

  constructor(args: {
    code: VineDecisionErrorCode;
    message: string;
    degradation: EngineDegradation;
  }) {
    super(args.message);
    this.name = 'VineDecisionError';
    this.code = args.code;
    this.degradation = args.degradation;
  }
}
