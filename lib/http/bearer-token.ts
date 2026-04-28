export function getStandardBearerHeader(headers: Headers): string | null {
  return headers.get('authorization');
}
