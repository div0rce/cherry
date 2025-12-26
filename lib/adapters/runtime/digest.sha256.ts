import crypto from 'node:crypto';
import type { Digest } from '../digest.js';

export const Sha256Digest: Digest = {
  sha256: (payload) => crypto.createHash('sha256').update(payload).digest('hex'),
};
