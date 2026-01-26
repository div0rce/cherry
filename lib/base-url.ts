import type { PublicConfig } from './config/public';
import { getPublicConfig } from './config/store.js';

const FALLBACK_URL = 'http://localhost:3000';

function normalize(url: string): string {
  const trimmed = url.trim();
  if (trimmed === '') {
    return FALLBACK_URL;
  }
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

export function getBaseUrl(config?: Pick<PublicConfig, 'appBaseUrl'>): string {
  const resolved = config?.appBaseUrl ?? getPublicConfig().appBaseUrl;
  return normalize(resolved);
}
