import * as crypto from 'node:crypto';
import type { EntropySource } from '../entropy';

export const NodeEntropy: EntropySource = {
  randomBytes: (length) => crypto.randomBytes(length),
};
