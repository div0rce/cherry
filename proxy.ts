import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { ROUTES } from './lib/routes.js';

const DEV_PATH_REGEX = new RegExp(`^${ROUTES.dev.root}(\\/.*)?$`);
const DEV_API_REGEX = new RegExp(`^/api${ROUTES.dev.root}(\\/.*)?$`);

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const isDevRoute = DEV_PATH_REGEX.test(pathname) || DEV_API_REGEX.test(pathname);

  if (!isDevRoute) {
    return NextResponse.next();
  }

  const env = process.env.NODE_ENV;
  const devAllowed =
    env !== 'production' || process.env['CHERRY_DEV_SHELL_ENABLED'] === 'true';

  if (!devAllowed) {
    return new NextResponse('Dev console is disabled in this environment.', { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  // NOTE: matcher must be static literals; keep in sync with ROUTES.dev.root === '/dev'.
  matcher: ['/dev/:path*', '/api/dev/:path*'],
};
