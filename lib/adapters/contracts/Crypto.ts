export interface Crypto {
  hmacSha256Hex(secret: string, message: string): string;
}
