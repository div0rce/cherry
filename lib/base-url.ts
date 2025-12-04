const FALLBACK_URL = 'http://localhost:3000';

function normalize(url: string): string {
  const trimmed = url.trim();
  if (trimmed === '') {
    return FALLBACK_URL;
  }
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

export function getBaseUrl(): string {
  const publicSiteUrl = process.env['NEXT_PUBLIC_SITE_URL'];
  if (publicSiteUrl !== undefined && publicSiteUrl !== '') {
    return normalize(publicSiteUrl);
  }
  const vercelUrl = process.env['NEXT_PUBLIC_VERCEL_URL'];
  if (vercelUrl !== undefined && vercelUrl !== '') {
    const withProtocol = vercelUrl.startsWith('http') ? vercelUrl : `https://${vercelUrl}`;
    return normalize(withProtocol);
  }
  const nextAuthUrl = process.env.NEXTAUTH_URL;
  if (nextAuthUrl !== undefined && nextAuthUrl !== '') {
    return normalize(nextAuthUrl);
  }
  return FALLBACK_URL;
}
