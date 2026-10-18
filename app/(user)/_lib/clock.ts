export function resolveExplicitNow(raw: unknown): Date {
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return raw;
  }

  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed !== '') {
      // Form fields carry epoch milliseconds as a digit string; new Date('1792...') is Invalid Date.
      const parsed = /^\d+$/.test(trimmed) ? new Date(Number(trimmed)) : new Date(trimmed);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
  }

  throw new Error('Explicit `now` value is required.');
}
