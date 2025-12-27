export type IsoDateString = string & { __isoDateBrand: true };

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function asIsoDate(value: string): IsoDateString {
  if (!ISO_DATE_RE.test(value)) {
    throw new Error(`Invalid ISO date: ${value}`);
  }
  return value as IsoDateString;
}
