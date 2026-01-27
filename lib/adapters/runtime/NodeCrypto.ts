import * as crypto from 'node:crypto';
import type { Crypto } from '../contracts/Crypto.js';

export class NodeCrypto implements Crypto {
  hmacSha256Hex(secret: string, message: string): string {
    return crypto.createHmac('sha256', secret).update(message).digest('hex');
  }
}
