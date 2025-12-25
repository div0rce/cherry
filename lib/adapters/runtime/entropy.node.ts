import crypto from 'node:crypto';
import type { Entropy } from '../entropy';

export const NodeEntropy: Entropy = {
  randomUUID: () => crypto.randomUUID(),
  randomBytes: (length) => crypto.randomBytes(length),
};
