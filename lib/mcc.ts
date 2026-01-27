import mccCodes from '../data/mcc/mcc-codes.js';

export interface MccRange {
  start: number;
  end: number;
  description?: string;
  category?: string;
}

const MCC_SET = new Set<number>(mccCodes);

/**
 * Returns true if the given MCC code falls within the known MCC list.
 */
export function isValidMcc(mcc: number): boolean {
  return MCC_SET.has(mcc);
}

/**
 * Returns a normalized MCC integer if the input is a string or number.
 * Throws on invalid or NaN.
 */
export function normalizeMcc(input: string | number): number {
  const value = typeof input === 'string' ? Number.parseInt(input.trim(), 10) : Math.trunc(input);

  if (Number.isNaN(value)) {
    throw new Error(`Invalid MCC value: ${input}`);
  }

  return value;
}
