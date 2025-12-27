import { logError } from '../../../../../../lib/logger.js';
import { asAppError } from '../../../../../../lib/errors.js';

export function run(): void {
  try {
    throw new Error('boom');
  } catch (error) {
    asAppError(error);
    const err = new Error('secondary');
    logError('raw error logging', err);
  }
}
