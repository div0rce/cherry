import { isAuthorityVerdict } from './verdicts.js';

export function assertPolicyTotal<T extends { kind: unknown }>(
  result: T | null
): asserts result is T & { kind: string } {
  if (result == null) {
    throw new Error('policy-totality-violation: null result');
  }
  if (!isAuthorityVerdict(result.kind)) {
    throw new Error(`policy-totality-violation: invalid kind ${String(result.kind)}`);
  }
}
