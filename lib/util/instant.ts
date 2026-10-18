// Parses an explicit instant: a valid Date, finite epoch milliseconds, an epoch-ms digit string (as
// form fields carry it), or a date string. Returns null for anything else. Never reads the clock.
export function parseInstant(raw: unknown): Date | null {
  const candidate = toDate(raw);
  return candidate !== null && !Number.isNaN(candidate.getTime()) ? candidate : null;
}

function toDate(raw: unknown): Date | null {
  if (raw instanceof Date) return raw;
  if (typeof raw === 'number') return Number.isFinite(raw) ? new Date(raw) : null;
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  const trimmed = raw.trim();
  // new Date('1792284962908') is Invalid Date, so digit strings are read as milliseconds.
  return /^\d+$/.test(trimmed) ? new Date(Number(trimmed)) : new Date(trimmed);
}
