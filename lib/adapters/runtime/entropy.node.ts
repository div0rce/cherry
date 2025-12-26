import crypto from 'node:crypto';
import type { EntropySource } from '../entropy.js';

export const NodeEntropy: EntropySource = {
  randomBytes: (length) => crypto.randomBytes(length),
};
