import { parseInstant } from '../../../lib/util/instant.js';

export function resolveExplicitNow(raw: unknown): Date {
  const parsed = parseInstant(raw);
  if (parsed === null) {
    throw new Error('Explicit `now` value is required.');
  }
  return parsed;
}
