export type EntropySource = {
  randomBytes(length: number): Uint8Array;
};
