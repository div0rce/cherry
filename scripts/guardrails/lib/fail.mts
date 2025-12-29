type FailOptions = {
  details?: string[] | undefined;
  fix?: string | string[] | undefined;
};

function normalizeLines(value?: string[] | string): string[] {
  if (value === undefined) return [];
  if (Array.isArray(value)) return value.filter((line) => line.trim().length > 0);
  const trimmed = value.trim();
  return trimmed.length > 0 ? [trimmed] : [];
}

export function fail(
  prefix: string,
  message: string,
  details?: string[] | FailOptions
): never {
  const resolved = Array.isArray(details) ? { details } : details ?? {};
  const detailLines = normalizeLines(resolved.details);
  const fixLines = normalizeLines(resolved.fix);
  const lines: string[] = [`${prefix}: ${message}`];

  if (detailLines.length > 0) {
    lines.push('DETAILS:');
    lines.push(...detailLines);
  }

  if (fixLines.length > 0) {
    lines.push('FIX:');
    lines.push(...fixLines);
  }

  process.stderr.write(`${lines.join('\n')}\n`);
  process.exit(1);
}
