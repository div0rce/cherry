import { logError } from '@/lib/logger';
import { asError } from '@/lib/errors';

export function run(): void {
  try {
    throw new Error('boom');
  } catch (error) {
    asError(error);
    const err = new Error('secondary');
    logError('raw error logging', err);
  }
}
