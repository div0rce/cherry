const FALLBACK_URL = 'http://localhost:3000';

function normalize(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) {
    return FALLBACK_URL;
  }
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

export function getBaseUrl(): string {
  if (process.env['NEXT_PUBLIC_SITE_URL']) {
    return normalize(process.env['NEXT_PUBLIC_SITE_URL']);
  }
  if (process.env['NEXT_PUBLIC_VERCEL_URL']) {
    const value = process.env['NEXT_PUBLIC_VERCEL_URL'];
    const withProtocol = value.startsWith('http') ? value : `https://${value}`;
    return normalize(withProtocol);
  }
  if (process.env.NEXTAUTH_URL) {
    return normalize(process.env.NEXTAUTH_URL);
  }
  return FALLBACK_URL;
}
