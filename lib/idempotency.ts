import type { World } from './adapters/world';
import { asAppError } from './errors';

export async function withIdempotency<T>(
  world: World,
  key: string,
  userId: string,
  run: () => Promise<T>,
  serialize: (value: T) => Record<string, unknown>,
  deserialize: (payload: Record<string, unknown>) => T
): Promise<T> {
  const existing = await world.stores.idempotency.get(userId, key);
  if (existing) {
    return deserialize(existing.payload);
  }

  const value = await run();
  const payload = serialize(value);
  const record = {
    key,
    userId,
    createdAtMs: world.clock.nowMs(),
    payload,
  };

  try {
    await world.stores.idempotency.put(record);
  } catch (err: unknown) {
    const appError = asAppError(err);
    const code = (err as { code?: string }).code;
    if (code === 'P2002') {
      const fallback = await world.stores.idempotency.get(userId, key);
      if (fallback) {
        return deserialize(fallback.payload);
      }
    }
    throw appError;
  }

  return value;
}
