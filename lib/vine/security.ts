/**
 * Cherry Vine security helpers (design stub).
 *
 * Purpose:
 * - Central place to define HMAC/nonce verification and device registry lookups
 *   for Vine-originated OrderContext payloads.
 *
 * Current status:
 * - No real signatures or device registry are enforced yet.
 * - /api/vine/order only enforces timestamp freshness.
 *
 * Future behavior (see docs/cherry-core-loop-engine-vine-wallet-audit.md §§4, 6):
 * - Look up a registered Vine device by deviceId.
 * - Verify an HMAC or similar signature over (deviceId, timestamp bucket, nonce, amount).
 * - Reject spoofed or stale payloads before they reach the engine.
 */
export async function verifyVinePayloadSignature(
  // TODO(vine-signature): add signature fields (deviceId, nonce, timestamp, signature, etc.)
): Promise<{ ok: true; reason: 'not_implemented' }> {
  // TODO(vine-signature): implement HMAC/nonce/device verification when a device registry exists.
  // For now, this is intentionally a no-op; /api/vine/order must not rely on this for correctness.
  return { ok: true, reason: 'not_implemented' } as const;
}

