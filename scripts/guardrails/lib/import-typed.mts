import { pathToFileURL } from 'node:url';

export async function importUnknown(pathOrUrl: string | URL): Promise<unknown> {
  if (pathOrUrl instanceof URL) {
    return import(pathOrUrl.href);
  }
  if (pathOrUrl.startsWith('file:')) {
    return import(pathOrUrl);
  }
  return import(pathToFileURL(pathOrUrl).href);
}
