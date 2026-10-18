export function toDate(ms: number): Date {
  return new Date(ms);
}
export function monthStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}
