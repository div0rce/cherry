import { resolveTmpRoot as resolveTmpRootRuntime } from '../../lib/tmp/allocate.js';
import { asMessage } from '../guardrails/lib/error.mjs';
import { fail } from '../guardrails/lib/fail.mjs';

const PREFIX = 'tmp-root';
const FIX = 'Set CHERRY_TMP_ROOT to a writable, private directory (e.g. "$HOME/.cherry-tmp").';

export function resolveTmpRoot(): string {
  try {
    return resolveTmpRootRuntime();
  } catch (error: unknown) {
    const message = asMessage(error);
    fail(PREFIX, message, { fix: FIX });
  }
}
