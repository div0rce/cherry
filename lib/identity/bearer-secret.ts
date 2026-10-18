import { timingSafeEqual } from 'node:crypto';

// Machine-to-machine check for internal batch routes: `Authorization: Bearer <secret>`, compared
// in constant time. Fails closed when the secret is missing or shorter than minLength.
export function hasBearerSecret(headers: Headers, secret: string | undefined, minLength: number): boolean {
  if (secret === undefined || secret.length < minLength) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(headers.get('authorization') ?? '');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
